import json
import datetime
from status.util import SafeHandler


class DataDeliveryHandler(SafeHandler):
    """ Handles the api call to proj_staged data
    Loaded through /api/v1/proj_staged/([^/]*)$
    """

    def get(self, search_string=None):
        staged_files_sum_view = self.application.projects_db.view("project/staged_files_sum")

        today = datetime.date.today()
        if search_string:
            start_date, end_date = search_string.split('--')
        else:
            last_month = today - datetime.timedelta(days=30)
            start_date = last_month.isoformat()
            end_date = today.isoformat()

        docs = staged_files_sum_view.rows
        # Projects without close date are filtered out
        data = [d.value for d in docs if start_date <= d.value.get('close_date', 'ZZZZ-ZZ-ZZ') < end_date]
        data = sorted(data, key=lambda d: d['close_date'])

        self.set_header('Content-type', "application/json")
        self.write(json.dumps(data))


class DeliveryPlotHandler(SafeHandler):
    """ Handles the delivery_plot page
    Loaded through /data_delivered_plot
    """
    def get(self):
        t = self.application.loader.load("data_delivered_plot.html")
        self.write(t.generate(gs_globals=self.application.gs_globals,
                              user=self.get_current_user()))
