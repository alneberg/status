import json
import datetime
from status.util import SafeHandler

class BioinfoAnalysisHandler(SafeHandler):
    """queries and posts about bioinfo analysis
    URL: /api/v1/bioinfo/([^/]*)"""

    def post(self, project_id):
        v = self.application.bioinfo_db.view("full_doc/pj_run_lane_sample_to_doc")
        user = self.get_secure_cookie('user')
        data = json.loads(self.request.body)
        saved_data = {}
        for run_id in data:
            ## why run_id is a string??
            project, sample, run, lane = run_id.split(',')
            for row in v[[project, run, lane, sample]]:
                original_doc = row.value
                timestamp=datetime.datetime.now().isoformat()
                # if the doc wasn't change, skip it
                changed = False
                if 'values' not in original_doc:
                    for key, value in data[run_id]['qc'].items():
                        if value != '?':
                            changed = True
                            original_doc['values'] = {}
                else:
                    last_timestamp = max(original_doc['values'].keys())
                    last_change = original_doc['values'][last_timestamp]
                    if last_change.get('qc') != data[run_id]['qc'] or last_change.get('bp') != data[run_id]['bp'] \
                            or last_change.get('datadelivered', '') != data[run_id]['datadelivered']:
                        changed = True
                if changed:
                    original_doc['values'][timestamp] = data[run_id]
                    original_doc['values'][timestamp]['user'] = user
                    original_doc['values'][timestamp]['sample_status'] = data[run_id]['sample_status']
                    if 'datadelivered' in data[run_id]:
                        original_doc['values'][timestamp]['datadelivered'] = data[run_id]['datadelivered']
                    try:
                        self.application.bioinfo_db.save(original_doc)
                        saved_data[run_id] = original_doc['values'][timestamp] # the last one
                    except Exception, err:
                        self.set_status(400)
                        self.finish('<html><body><p>Could not save bioinfo data. Please try again later.</p><pre>{}</pre></body></html>'.format(traceback.format_exc()))
                        return None
        self.set_status(200)
        self.set_header("Content-type", "application/json")
        self.write(json.dumps(saved_data))


    def get(self, proj_id):
        t = self.application.loader.load("bioinfo_tab.html")
        sample_run_view = self.application.bioinfo_db.view('latest_data/sample_id')
        bioinfo_data = {'sample_run_lane_view': {}, 'run_lane_sample_view': {}}
        project_closed = False
        for row in sample_run_view.rows:
            project_id = row.key[0]
            if project_id == proj_id:
                flowcell_id = row.key[1]
                lane_id = row.key[2]
                sample_id = row.key[3]

                # building first view
                bioinfo1 = bioinfo_data['sample_run_lane_view']
                if project_id not in bioinfo1:
                    bioinfo1[project_id] = {'samples': {sample_id: {'flowcells': {flowcell_id: {'lanes': {lane_id: row.value}}}}}}
                elif sample_id not in bioinfo1[project_id]['samples']:
                    bioinfo1[project_id]['samples'][sample_id] = {'flowcells': {flowcell_id: {'lanes': {lane_id: row.value}}}}
                elif flowcell_id not in bioinfo1[project_id]['samples'][sample_id]['flowcells']:
                    bioinfo1[project_id]['samples'][sample_id]['flowcells'][flowcell_id] = {'lanes': {lane_id: row.value}}
                elif lane_id not in bioinfo1[project_id]['samples'][sample_id]['flowcells'][flowcell_id]['lanes']:
                    bioinfo1[project_id]['samples'][sample_id]['flowcells'][flowcell_id]['lanes'][lane_id] = row.value
                else:
                    bioinfo1[project_id]['samples'][sample_id]['flowcells'][flowcell_id]['lanes'][lane_id].update(row.value)

                # building the second view
                bioinfo2 = bioinfo_data['run_lane_sample_view']
                if project_id not in bioinfo2:
                    bioinfo2[project_id] = {'flowcells': {flowcell_id: {'lanes': {lane_id: {'samples': {sample_id: row.value }}}}}}
                elif flowcell_id not in bioinfo2[project_id]['flowcells']:
                    bioinfo2[project_id]['flowcells'][flowcell_id] = {'lanes': {lane_id: {'samples': {sample_id: row.value }}}}
                elif lane_id not in bioinfo2[project_id]['flowcells'][flowcell_id]['lanes']:
                    bioinfo2[project_id]['flowcells'][flowcell_id]['lanes'][lane_id] = {'samples': {sample_id: row.value}}
                elif sample_id not in bioinfo2[project_id]['flowcells'][flowcell_id]['lanes'][lane_id]['samples']:
                    bioinfo2[project_id]['flowcells'][flowcell_id]['lanes'][lane_id]['samples'][sample_id] = row.value
                else:
                    bioinfo2[project_id]['flowcells'][flowcell_id]['lanes'][lane_id]['samples'][sample_id].update(row.value)

        # checking status for run-lane-sample view
        for project_id, project in bioinfo_data['run_lane_sample_view'].items():
            for flowcell_id, flowcell in project['flowcells'].items():
                fc_statuses = []
                fc_delivery_dates = []
                for lane_id, lane in flowcell['lanes'].items():
                    lane_statuses = []
                    lane_delivery_dates = []
                    for sample_id, sample in lane['samples'].items():
                        lane_statuses.append(sample['sample_status'])
                        lane_delivery_dates.append(sample.get('datadelivered', ''))
                    if all(lane_delivery_dates):
                        lane_delivery_date = min(lane_delivery_dates)
                    else:
                        lane_delivery_date = ''
                    lane['datadelivered'] = lane_delivery_date
                    fc_delivery_dates.append(lane_delivery_date)
                    lane['lane_status'] = self._agregate_status(lane_statuses)
                    fc_statuses.append(lane['lane_status'])
                flowcell['flowcell_status'] = self._agregate_status(fc_statuses)
                if all(fc_delivery_dates):
                    fc_delivery_date= min(fc_delivery_dates)
                else:
                    fc_delivery_date = ''
                flowcell['datadelivered'] = fc_delivery_date

        # checking status for sample-run-lane view
        for project_id, project in bioinfo_data['sample_run_lane_view'].items():
            for sample_id, sample in project['samples'].items():
                sample_statuses = []
                sample_delivery_dates = []
                for flowcell_id, flowcell in sample['flowcells'].items():
                    fc_statuses = []
                    fc_delivery_dates = []
                    for lane_id, lane in flowcell['lanes'].items():
                        fc_statuses.append(lane['sample_status'])
                        fc_delivery_dates.append(lane.get('datadelivered', ''))
                    if all(fc_delivery_dates):
                        fc_delivery_date = min(fc_delivery_dates)
                    else:
                        fc_delivery_date = ''
                    flowcell['datadelivered'] = fc_delivery_date
                    sample_delivery_dates.append(fc_delivery_date)
                    flowcell['flowcell_status'] = self._agregate_status(fc_statuses)
                    sample_statuses.append(flowcell['flowcell_status'])
                sample['sample_status'] = self._agregate_status(sample_statuses)
                if all(sample_delivery_dates):
                    sample_delivery_date = min(sample_delivery_dates)
                else:
                    sample_delivery_date = ''
                sample['datadelivered'] = sample_delivery_date

        project_view = self.application.projects_db.view('project/summary')
        application = ""

        for row in project_view.rows:
            if row.key[1] == proj_id:
                if row.value.get('close_date'):
                    project_closed = True
                # sometimes this value is not set
                application = row.value.get('application')
                break

        app_classes = {
            'rnaseq': ['RNA-seq', 'RNA-seq (total RNA)', 'RNA-seq (RiboZero)', 'RNA-seq (mRNA)', 'stranded RNA-seq (total RNA)', 'cDNA', 'stranded RNA-seq (RiboZero)'],
            'exome': ['Exome capture'],
            'customCap': ['Custom capture'],
            'WGreseq': ['WG re-seq', 'WG re-seq (IGN)'],
            'denovo': ['de novo', 'Mate-pair', 'Mate-pair (short insert)', 'Mate-pair (long insert)']
        }

        for key in app_classes:
            # for app_class in app_classes[key]:
            if application in app_classes[key]:
                application = key
                break
        self.write(t.generate(gs_globals=self.application.gs_globals, project=proj_id,
                              user=self.get_current_user_name(),
                              # columns=self.application.genstat_defaults.get('pv_columns'),
                              # columns_sample=self.application.genstat_defaults.get('sample_columns'),
                              # prettify=prettify_css_names,
                              # worksets=worksets_view[proj_id],
                              bioinfo=bioinfo_data,
                              app_classes=app_classes,
                              # qc_done=False,
                              application=application,
                              project_closed=project_closed
                              ))

    def _agregate_status(self, statuses):
        """
        Helper function, agregates status from the lower levels
        """

        # my guess here agregation is already done from flowcell status
        # so this condition will most probably always be true
        if len(set(statuses)) == 1:
            status = statuses[0]
        elif 'Sequencing' in statuses:
            status = 'Sequencing'
        elif 'Demultiplexing' in statuses:
            status = 'Demulitplexing'
        elif 'Transferring' in statuses:
            status = 'Transferring'
        elif 'New' in statuses:
            status = 'New'
        elif 'QC-ongoing' in statuses:
            status = 'QC-ongoing'
        elif 'QC-done' in statuses:
            status = 'QC-done'
        elif 'BP-ongoing' in statuses:
            status = 'BP-ongoing'
        elif 'BP-done' in statuses:
            status = 'BP-done'
        elif 'Failed' in statuses:
            status = 'Failed'
        elif 'Delivered' in statuses:
            status = 'Delivered'
        else:
            pass
            # unknown status, if happens it will fail
        return status # may fail here, if somebody defined a new status without updating this function
