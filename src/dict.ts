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
		},
		"Электронная почта": 
		{
			en: 'email'
		},
		"Пароль": 
		{
			en: 'Password'
		},
		"Войти": 
		{
			en: 'Sign in'
		},
		"Вы находитесть на странице проекта Unkaos. Данный инструмент создан в целях борьбы с хаосом в разработке программного обеспечения и других проектах, нуждающихся в качественном трекере задач.": 
		{
			en: 'You are on the page of the Unkaos project. This is an instrument to fight chaos in software development and other projects that need a task tracker'
		}
		,
		"Система бесплатна и распространяется под лицензией Apache 2.0, вы можете как пользоваться облачной версией, так и установить коробочную версию. Исходный код открыт и доступен в репозитории https://github.com/khvilon/unkaos.": 
		{
			en: 'The system is free and is made under Apache 2.0 license. You can use it the cloud or install from https://github.com/khvilon/unkaos.'
		}
		,
		"Связаться с автором можно по почте n@khvilon.ru (Николй Хвилон)":
		{
			en: 'To contact the author you can use email n@khvilon.ru (Nikolas Khvilon)'
		}
		,
		"Доски":
		{
			en: 'Boards'
		}
		,
		"Спринты":
		{
			en: 'Sprints'
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













