export default
{
	_langs:['en'],
	_dict_langs: {
		"Задачи": 
		{
			en: 'Issues'
		},
		"Задача": 
		{
			en: 'Issue'
		},
		"Пользователи": 
		{
			en: 'Users'
		},
		"Пользователь": 
		{
			en: 'User'
		},
		"Воркфлоу": 
		{
			en: 'Workflow'
		},
		"Создать": 
		{
			en: 'Create'
		}
		,
		"Удалить": 
		{
			en: 'Delete'
		},
		"Дашборды": 
		{
			en: 'Dashboards'
		},
		"Дашборд": 
		{
			en: 'Dashboard'
		},
		"Уведомления": 
		{
			en: 'Alerts'
		},
		"Проекты": 
		{
			en: 'Projects'
		},
		"Роли": 
		{
			en: 'Roles'
		},
		"Поля": 
		{
			en: 'Fields'
		},
		"Статусы задач": 
		{
			en: 'Issue statuses'
		},
		"Типы задач": 
		{
			en: 'Issue types'
		},
		"Воркфлоу задач": 
		{
			en: 'Workflows'
		},
		"Настройки": 
		{
			en: 'Configurations'
		},
		"Название": 
		{
			en: 'Title'
		},
		"Автор": 
		{
			en: 'Author'
		},
		"Ответственный": 
		{
			en: 'Assigny'
		},
		"Создана": 
		{
			en: 'Created'
		},
		"Изменена": 
		{
			en: 'Updated'
		}
		,
		"Создать задачу": 
		{
			en: 'Create issue'
		},
		"Поиск...": 
		{
			en: 'Search...'
		}


		
	


	},

	set_lang:function(lang)
	{
		if(this._langs.includes(lang)){
			for(let i in this._dict_langs){
				this[i] = this._dict_langs[i][lang]
			}
		}
		else{
			for(let i in this._dict_langs){
				this[i] = i
			}
		}
	}
}













