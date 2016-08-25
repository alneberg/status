from status.util import SafeHandler

tresholds = {
    'HiSeq X': 320,
    'RapidHighOutput': 188,
    'HighOutput': 143,
    'RapidRun': 114,
    'MiSeq Version3': 18,
    'MiSeq Version2': 10,
}

class FlowcellHandler(SafeHandler):
    """ Serves a page which shows information for a given flowcell.
    """
    def get(self, flowcell_id):
        view = self.application.x_flowcells_db.view('info/summary2')
        flowcell = [row.value for row in view[flowcell_id].rows]
        flowcell = flowcell[0] if len(flowcell) >= 1 else {}
        if not flowcell:
            # get by long name
            view = self.application.x_flowcells_db.view('info/summary2_full_id')
            flowcell = [row.value for row in view[flowcell_id].rows]
            flowcell = flowcell[0] if len(flowcell) >= 1 else {}
        # replace '__' in project name
        if 'plist' in flowcell:
            replaced_plist = []
            for project in flowcell['plist']:
                if '__' in project:
                    project = project.replace('__', '.')
                else: # replace only the first one
                    project = project.replace('_', '.', 1)
                if project != 'default':
                    replaced_plist.append(project)
            flowcell['plist'] = replaced_plist

        if not flowcell:
            self.set_status(200)
            t = self.application.loader.load("flowcell_error.html")
            self.write(t.generate(gs_globals=self.application.gs_globals,
                                  flowcell_id=flowcell_id,
                                  user=self.get_current_user_name(),
                                  ))
            return
        else:
            t = self.application.loader.load("flowcell.html")
            self.write(t.generate(gs_globals=self.application.gs_globals,
                                  flowcell=flowcell,
                                  flowcell_id=flowcell_id,
                                  tresholds=tresholds,
                                  user=self.get_current_user_name()))
