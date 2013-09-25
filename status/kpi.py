"""Handlers related to KPI:s at genomics-dashboard
"""
import tornado.web
import json

class ProjectDatesDataHandler(tornado.web.RequestHandler):
    """ Serves variuos dates related to each project.
    """
    def get(self):
        application = self.get_argument("application", None)
        platform = self.get_argument("platform", None)

        projects = {}
        view = self.application.projects_db.view("process_flow/KPI_applications",reduce=False)
        # key = (application, project_name, project_id, sample, library_prep)
        if application:
            for row in view[[application]:[application +"z"]]:
                projects[str(row.key)] = row.value
        else:
            for row in view:
                projects[str(row.key)] = row.value
        
        self.set_header("Content-type", "application/json")
        self.write(json.dumps(projects))

