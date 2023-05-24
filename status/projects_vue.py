import logging

from status.util import SafeHandler

class ProjectsVuePageHandler(SafeHandler):
    """ Serves the projects vue page

        Loaded through:
            /projects_vue

    """
    def get(self):
        t = self.application.loader.load("projects_vue.html")
        self.write(t.generate(gs_globals=self.application.gs_globals, user=self.get_current_user()))