// LocalStorage wrapper
export default class cache {

  static defaultSettings: Map<string, string> = new Map ([
    ['theme',                    "dark"  ],
    ['issues_query',             ""      ],
    ['lock_main_menu',           "false" ],
    ['actions_sort_order',       "true"  ],
    ['actions_show_comments',    "true"  ],
    ['actions_show_time',        "true"  ],
    ['actions_show_edits',       "true"  ],
    ['actions_show_transitions', "true"  ],
  ])

  static clear() {
    localStorage.clear()
  }

  // Get object from localStorage
  static getObject(settingName: string) : any {
    return this.get(settingName, true)
  }

  // Get string from localStorage
  static getString(settingName: string) : string {
    return this.get(settingName, false)
  }

  // Write object to localStorage as JSON string
  static setObject(settingName: string, object: any) {
    localStorage.setItem(settingName, object)
  }

  // Write string to localStorage
  static setString(settingName: string, object: string) {
    localStorage.setItem(settingName, JSON.stringify(object))
  }

  // Get value from localStorage or return and save default value if none is set.
  private static get(settingName: string, asObject: boolean) : any {
    const storageValue = localStorage.getItem(settingName)
    if (storageValue !== undefined) {
      if (storageValue !== null) {
        if (asObject) {
          return JSON.parse(storageValue)
        } else {
          return storageValue
        }
      }
    } else {
      // return default value and add default value to localStorage
      const defaultSetting = this.defaultSettings.get(settingName)
      if (defaultSetting !== undefined) {
        if (asObject) {
          localStorage.setItem(settingName, JSON.parse(defaultSetting))
          return JSON.parse(defaultSetting)
        } else {
          localStorage.setItem(settingName, defaultSetting)
          return defaultSetting
        }
      }
    }
    return undefined
  }
}

