UPDATE public.permissions SET targets =
'[
    {"allow": "R", "table": "favourites"},

    {"allow": "R", "table": "configs"},
    {"allow": "R", "table": "sprints"},
    {"allow": "R", "table": "projects"},
    {"allow": "R", "table": "users"},
    {"allow": "R", "table": "roles"},
    {"allow": "R", "table": "users_to_roles"},
    {"allow": "R", "table": "permissions"},
    {"allow": "R", "table": "boards"},
    {"allow": "R", "table": "dashboards"},
    {"allow": "R", "table": "dashboard"},
    {"allow": "R", "table": "board"},
    {"allow": "R", "table": "boards_filters"},

    {"allow": "R", "table": "field_types"},
    {"allow": "R", "table": "gadget_types"},
    {"allow": "R", "table": "issue_actions_types"},
    {"allow": "R", "table": "favourites_types"},
    {"allow": "R", "table": "relation_types"},

    {"allow": "R", "table": "transitions"},
    {"allow": "R", "table": "workflows"},
    {"allow": "R", "table": "workflow_nodes"},
    {"allow": "R", "table": "fields"},
    {"allow": "R", "table": "issue_statuses"},
    {"allow": "R", "table": "issue_types"},
    {"allow": "R", "table": "issue_types_to_fields"},
    {"allow": "CRU", "table": "issue_tags"},

    {"allow": "CRU", "table": "issues"},
    {"allow": "CRU", "table": "issue"},
    {"allow": "R", "table": "issues_count"},
    {"allow": "R", "table": "issue_uuid"},
    {"allow": "R", "table": "old_issue_uuid"},
    {"allow": "R", "table": "formated_relations"},
    {"allow": "CRU", "table": "watcher"},
    {"allow": "R", "table": "issue_formated_actions"},
    {"allow": "CRU", "table": "attachments"},
    {"allow": "CRU", "table": "time_entries"},
    {"allow": "CRU", "table": "issue_tags_selected"},
    {"allow": "CRU", "table": "issue_actions"}

]' WHERE code = 'common';