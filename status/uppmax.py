""" Handlers for uppmax disk usage
"""

from status.util import SafeHandler

class UppmaxDiskUsageHandler(SafeHandler):
    """Handler to serve the uppmax_disk_usage page"""
    def get(self):
        t = self.application.loader.load("uppmax_disk_usage.html")
        self.write(t.generate(gs_globals=self.application.gs_globals, user=self.get_current_user()))
