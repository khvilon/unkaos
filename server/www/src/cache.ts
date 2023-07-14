class Setting {
  name: string
  default_val: any
  is_object: boolean

  constructor(name :string, default_val: string, is_object: boolean) {
    this.name = name
    this.default_val = default_val
    this.is_object = is_object
  }
}

// LocalStorage wrapper
export default class cache {

  static profile_listener_callback: any

  static set_profile_listener(callback: any){
    this.profile_listener_callback = callback
  }

  static defaultSettings: Array<Setting> = [
    new Setting('theme',                    'dark',   false),
    new Setting('issues_query',             '',       false),
    new Setting('lock_main_menu',           'false',  true),
    new Setting('actions_sort_order',       'true',   true),
    new Setting('actions_show_comments',    'true',   true),
    new Setting('actions_show_time',        'true',   true),
    new Setting('actions_show_edits',       'true',   true),
    new Setting('actions_show_transitions', 'true',   true),
    new Setting('issues_drafts', '{}',   true)
  ]

  static clear() {
    localStorage.clear()
  }

  static loadDefaultsIfNecessary() {
    this.defaultSettings.forEach(
      (setting) => this.get(setting.name, setting.is_object)
    )
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
    localStorage.setItem(settingName, JSON.stringify(object))
    if(this.profile_listener_callback) this.profile_listener_callback(object)
  }

  // Write string to localStorage
  static setString(settingName: string, string: string) {
    localStorage.setItem(settingName, string)
  }

  // Get value from localStorage or return and save default value if none is set.
  private static get(settingName: string, asObject: boolean) : any {
    const storageValue = localStorage.getItem(settingName)
    if (storageValue !== null) {
      if (asObject) {
        return JSON.parse(storageValue)
      } else {
        return storageValue
      }
    } else {
      // return default value and add default value to localStorage
      const defaultSetting = this.defaultSettings.find( (setting)=> setting.name == settingName)
      if (defaultSetting !== undefined) {
        if (asObject) {
          localStorage.setItem(settingName, defaultSetting.default_val)
          return JSON.parse(defaultSetting.default_val)
        } else {
          localStorage.setItem(settingName, defaultSetting.default_val)
          return defaultSetting
        }
      }
    }
    return undefined
  }
}

