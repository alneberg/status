import {vProjectCards, vProjectDataField, vProjectDetails} from './projects_components.js'
import { getDropdownPosition } from './smart_suggestion.js';
import { vRunningNotesTab, vRunningNoteSingle } from './running_notes_component.js'


const vProjectsStatus = {
    data() {
        return {
            /* Common data */
            project_details: {},
            project_samples: {},
            sticky_running_notes: {},
            running_notes: {},
            error_messages: [],
            websocket_message:'',
            websocket: null,
            /* Used for tagging running notes. */
            all_users: [],
            current_user: '',
            /* Used to determine behaviour of the app depending on if it's a single project or multiple projects */
            single_project_mode: false,
            /* Only used on project cards page */
            all_projects: {},
            sortBy: 'most_recent_date',
            card_columns: ['application'],
            descending: true,
            search_value: '',
            open_modal_card: null,
            // Filters
            status_filter: [],
            include_all_statuses: true,
            type_filter: [],
            include_all_types: true,
            project_coordinator_filter: [],
            include_all_lab_responsibles: true,
            lab_responsible_filter: [],
            include_all_project_coordinators: true,
            library_construction_method_filter: [],
            include_all_library_construction_methods: true,
            application_filter: [],
            include_all_applications: true
        }
    },
    computed: {
        /* Only used on project cards page*/
        visibleProjects() {
            /* Filters and sorts the projects */
            if (Object.keys(this.all_projects).length == 0) {
                return this.all_projects
            }

            let tempProjects = Object.entries(this.all_projects)

            // Process application filter
            if (!this.include_all_applications) {
                tempProjects = tempProjects.filter(([project_id, project]) => {
                    return this.application_filter.includes(project['application'])
                })
            }

            // Process status filter
            if (!this.include_all_statuses) {
                tempProjects = tempProjects.filter(([project_id, project]) => {
                    return this.status_filter.includes(project['status_fields']['status'])
                })
            }

            // Project type filter
            if (!this.include_all_types) {
                tempProjects = tempProjects.filter(([project_id, project]) => {
                    return this.type_filter.includes(project['type'])
                })
            }

            // Project coordinator filter
            if (!this.include_all_project_coordinators) {
                tempProjects = tempProjects.filter(([project_id, project]) => {
                    return this.project_coordinator_filter.includes(project['project_coordinator'])
                })
            }

            // Lab responsible filter
            if (!this.include_all_lab_responsibles) {
                tempProjects = tempProjects.filter(([project_id, project]) => {
                    // Special case for undefined
                    if (this.lab_responsible_filter.includes('undefined')) {
                        if (project['lab_responsible'] == undefined) {
                            return true
                        }
                    }
                    return this.lab_responsible_filter.includes(project['lab_responsible'])
                })
            }

            // Library construction method filter
            if (!this.include_all_library_construction_methods) {
                tempProjects = tempProjects.filter(([project_id, project]) => {
                    return this.library_construction_method_filter.includes(project['library_construction_method'])
                })
            }

            // Search filter
            if (this.search_value != '' && this.search_value) {
                tempProjects = tempProjects.filter(([project_id, project]) => {
                    return JSON.stringify(project)
                    .toUpperCase()
                    .includes(this.search_value.toUpperCase())
                })
            }

            if (this.sortBy == 'most_recent_date') {
                tempProjects = this.sortOnMostRecentDate(tempProjects)
            } else if (this.sortBy == 'project_id') {
                // Sort on project_id
                tempProjects = tempProjects.sort((a, b) => {
                    if (a[0] > b[0]) {
                        return 1
                    } else if (a[0] < b[0]) {
                        return -1
                    }
                    return 0
                })
            } else if (this.sortBy == 'status') {
                // Sort on status
                tempProjects = tempProjects.sort((a, b) => {
                    let proj_a = this.all_projects[a[0]]
                    let proj_b = this.all_projects[b[0]]
                    if (proj_a['status_fields']['status'] > proj_b['status_fields']['status']) {
                        return 1
                    } else if (proj_a['status_fields']['status'] < proj_b['status_fields']['status']) {
                        return -1
                    }
                    return 0
                })
            }

            if (this.descending == true) {
                tempProjects = tempProjects.reverse()
            }

            return Object.fromEntries(tempProjects)
        },
        allColumnValues() {
            /* Returns a dictionary with card column as key and the project_ids as values */
            let columnValues = {}
            for (let project_id in this.visibleProjects) {
                let project = this.visibleProjects[project_id]
                let columnValue;
                if (this.card_columns.length == 2) {
                    columnValue = project[this.card_columns[0]][this.card_columns[1]]
                } else {
                    columnValue = project[this.card_columns[0]]
                }
                if (columnValue in columnValues) {
                    columnValues[columnValue].push(project_id)
                } else {
                    columnValues[columnValue] = [project_id]
                }
            }
            return columnValues
        },
        allApplications() {
            return this.itemCounts(this.all_projects, 'application')
        },
        allApplicationsVisible() {
            return this.itemCounts(this.visibleProjects, 'application')
        },
        allLibraryConstructionMethods() {
            return this.itemCounts(this.all_projects, 'library_construction_method')
        },
        allLibraryConstructionMethodsVisible() {
            return this.itemCounts(this.visibleProjects, 'library_construction_method')
        },
        allStatuses() {
            return this.itemCounts(this.all_projects, ['status_fields', 'status'])
        },
        allStatusesVisible() {
            return this.itemCounts(this.visibleProjects, ['status_fields', 'status'])
        },
        allTypes() {
            return this.itemCounts(this.all_projects, 'type')
        },
        allTypesVisible() {
            return this.itemCounts(this.visibleProjects, 'type')
        },
        allProjectCoordinators() {
            return this.itemCounts(this.all_projects, 'project_coordinator')
        },
        allProjectCoordinatorsVisible() {
            return this.itemCounts(this.visibleProjects, 'project_coordinator')
        },
        allLabResponsibles() {
            return this.itemCounts(this.all_projects, 'lab_responsible')
        },
        allLabResponsiblesVisible() {
            return this.itemCounts(this.visibleProjects, 'lab_responsible')
        },
        currentActiveFilters() {
            // List the currently active filters for display purposes
            let activeFilters = []
            if (!this.include_all_applications) {
                activeFilters.push(['Application', this.application_filter])
            }
            if (!this.include_all_statuses) {
                activeFilters.push(['Status', this.status_filter])
            }
            if (!this.include_all_types) {
                activeFilters.push(['Type', this.type_filter])
            }
            if (!this.include_all_project_coordinators) {
                activeFilters.push(['Project Coordinator', this.project_coordinator_filter])
            }
            if (!this.include_all_lab_responsibles) {
                activeFilters.push(['Lab Responsible', this.lab_responsible_filter])
            }
            if (!this.include_all_library_construction_methods) {
                activeFilters.push(['Library Construction Method', this.library_construction_method_filter])
            }
            return activeFilters
        },
        sorting_icon() {
            if (this.descending) {
                return 'fa-arrow-down-wide-short'
            } else {
                return 'fa-arrow-up-wide-short '
            }
        },
    },
    methods: {
        fetchProjectDetails(project_id) {
            axios
                .get(`/api/v1/project_summary/${project_id}?view_with_sources=True`)
                .then(response => {
                    if (response.data !== null) {
                        this.project_details[project_id] = response.data;
                    }
                })
                .catch(error => {
                    this.error_messages.push('Error fetching project details for project ' + project_id + '. Please try again or contact a system administrator.');
                    console.log(error);
                });
            axios
                .get(`/api/v1/project/${project_id}`)
                .then(response => {
                    if (response.data !== null) {
                        this.project_samples[project_id] = response.data;
                    }
                })
                .catch(error => {
                    this.error_messages.push('Error fetching sample details for project ' + project_id + '. Please try again or contact a system administrator.');
                    console.log(error);
                });
            this.fetchStickyRunningNotes(project_id);
        },
        async fetchStickyRunningNotes(project_id) {
            let post_body;
            if (project_id !== undefined) {
                post_body = {project_ids: [project_id]};
            } else {
                post_body = {project_ids: Object.keys(this.all_projects)};
            }
            const sleep = (delay) => new Promise((resolve) => setTimeout(resolve,delay))

            if (Object.keys(this.all_projects).length === 0){
                // Wait for projects to be fetched even though the request should already have returned
                await sleep(1000);
            }
            axios
                .post('/api/v1/latest_sticky_run_note', post_body)
                .then(response => {
                    let data = response.data
                    if (data !== null) {
                        this.sticky_running_notes = Object.assign({}, this.sticky_running_notes, data);
                    }
                })
                .catch(error => {
                    this.error_messages.push('Unable to fetch sticky running notes, please try again or contact a system administrator.')
                })
        },
        setupWebsocket() {
            /* This is still a proof of concept */
            // Taken from https://stackoverflow.com/a/10418013
            let loc = window.location, new_uri;
            if (loc.protocol === "https:") {
                new_uri = "wss:";
            } else {
                new_uri = "ws:";
            }
            new_uri += "//" + loc.host;
            new_uri += "/api/v1/project_websocket";
            this.websocket = new WebSocket(new_uri);

            this.websocket.onmessage = (event) => {
                console.log(event.data);
                this.websocket_message = event.data;
            };
        },
        /* Only used on project cards page */
        fetchProjects() {
            axios
                .get('/api/v1/projects?list=pending,reception_control,review,ongoing&type=All')
                .then(response => {
                    let data = response.data
                    if (data !== null) {
                        this.all_projects = data
                    }
                    this.fetchStickyRunningNotes()
                })
                .catch(error => {
                    console.log(error)
                    this.error_messages.push('Unable to fetch projects, please try again or contact a system administrator.')
                })
        },
        fetchAllUsers() {
            axios
                .get('/api/v1/user_management/users')
                .then(response => {
                    let data = response.data
                    if (data !== null) {
                        this.all_users = Object.keys(data)
                            .map(email=>{
                                return email.split('@')[0]
                            })
                    }
                })
                .catch(error => {
                    console.log(error)
                    this.error_messages.push('Unable to fetch users, please try again or contact a system administrator.')
                })
        },
        // Helper methods
        getDropdownPositionHelper(input, dropdownHeight) {
            return getDropdownPosition(input, dropdownHeight)
        },
        itemCounts(list, key) {
            /* 
                Returns a dictionary with the counts of each unique item in the list 
                key is either a string with a key or an array with two keys
            */
            let items = []
            for (let item in list) {
                if (key instanceof Array) {
                    items.push(list[item][key[0]][key[1]])
                } else {
                    items.push(list[item][key])
                }
            }

            let itemCounts = {}
            for (let item of items) {
                if (item in itemCounts) {
                    itemCounts[item] += 1
                } else {
                    itemCounts[item] = 1
                }
            }
            // Convert the itemCounts object to an array of [key, value] pairs
            let sortedItemCounts = Object.entries(itemCounts);

            // Sort the array by the keys (i.e., the first element of each pair)
            sortedItemCounts.sort((a, b) => a[0].localeCompare(b[0]));

            // Convert the array back to an object
            itemCounts = Object.fromEntries(sortedItemCounts);

            return itemCounts
        },
        mostRecentDate(project) {
            let mostRecentKeyArray = this.mostRecentDateArray(project)
            return mostRecentKeyArray[1]
        },
        mostRecentDateArray(project) {
            if ('summary_dates' in project == false) {
                return []
            };
            let summaryDates = project['summary_dates'];
            if (Object.keys(summaryDates).length == 0) {
                return []
            };

            let mostRecentKey = Object.keys(summaryDates).reduce((a, b) => summaryDates[a] > summaryDates[b] ? a : b);
            return [mostRecentKey, summaryDates[mostRecentKey]]
        },
        nrWithApplicationVisible(application) {
            if (application in this.allApplicationsVisible) {
                return this.allApplicationsVisible[application]
            }
            return 0
        },
        nrWithLibraryConstructionMethodVisible(library_construction_method) {
            if (library_construction_method in this.allLibraryConstructionMethodsVisible) {
                return this.allLibraryConstructionMethodsVisible[library_construction_method]
            }
            return 0
        },
        nrWithStatusVisible(status) {
            if (status in this.allStatusesVisible) {
                return this.allStatusesVisible[status]
            }
            return 0
        },
        nrWithTypeVisible(type) {
            if (type in this.allTypesVisible) {
                return this.allTypesVisible[type]
            }
            return 0
        },
        nrWithProjectCoordinatorVisible(project_coordinator) {
            if (project_coordinator in this.allProjectCoordinatorsVisible) {
                return this.allProjectCoordinatorsVisible[project_coordinator]
            }
            return 0
        },
        nrWithLabResponsibleVisible(lab_responsible) {
            if (lab_responsible in this.allLabResponsiblesVisible) {
                return this.allLabResponsiblesVisible[lab_responsible]
            }
            return 0
        },
        projectTypeColor(project) {
            let type = project['type']
            if (type == 'Application') {
                return 'success'
            } else if (type == 'Production') {
                return 'primary'
            } else if (type == 'Facility') {
                return 'info'
            } else if (type == 'Single-Cell') {
                return 'warning'
            } else {
                return 'secondary'
            }
        },
        projectStatusColor(project) {
            let status = project['status_fields']['status']
            if (status == 'Pending') {
                return 'secondary'
            } else if (status == 'Reception Control') {
                return 'info'
            } else if (status == 'Ongoing') {
                return 'primary'
            }
            return 'warning'
        },
        sortOnMostRecentDate(projects_to_be_sorted) {
            // Sort by most recent date            
            projects_to_be_sorted = projects_to_be_sorted.sort((a, b) => {
                let proj_a = this.all_projects[a[0]]
                let proj_b = this.all_projects[b[0]]

                if (this.sortBy == 'most_recent_date') {
                    /* First deal with missing dates */
                    if ((this.mostRecentDate(proj_a) == undefined) && (this.mostRecentDate(proj_b) == undefined)) {
                        return 0
                    }
                    if (this.mostRecentDate(proj_a) == undefined) {
                        // Missing dates will be the most recent
                        return 1
                    } else if (this.mostRecentDate(proj_b) == undefined){
                        return -1
                    }
                    /* Then deal with actual dates */
                    if (this.mostRecentDate(proj_a) > this.mostRecentDate(proj_b)) {
                        return 1
                    } else if (this.mostRecentDate(proj_a) < this.mostRecentDate(proj_b)) {
                        return -1
                    }
                    return 0
                };
            })
            return projects_to_be_sorted
        },
        toggleSorting() {
            this.descending = !this.descending
        }
    }
}

const app = Vue.createApp(vProjectsStatus)
app.component('v-project-data-field-tooltip', vProjectDataField)
app.component('v-projects-cards', vProjectCards)
app.component('v-project-details', vProjectDetails)
app.component('v-running-note-single', vRunningNoteSingle)
app.component('v-running-notes-tab', vRunningNotesTab)
app.mount('#v_projects_main')