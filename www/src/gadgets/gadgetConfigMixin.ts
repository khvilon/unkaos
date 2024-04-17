import tools from "../tools";
export const gadgetConfigMixin = {
	data() {
	  return {
		currentConfig: {},
		currentTitle: ''
	  };
	},
	created() {
	  // Инициализируем currentConfig глубокой копией config
	  this.currentConfig = tools.clone_obj(this.config);
	  this.currentTitle = this.title;

	  console.log('this.currentConfig', this.currentConfig)
  
	  // Следим за изменениями config и обновляем currentConfig
	  this.$watch('config', (newVal) => {
		this.currentConfig = tools.clone_obj(newVal);
	  }, { deep: true });

	  this.$watch('title', (newVal) => {
		this.currentTitle = this.title;
	  });
	},
	methods: {
	  handleOk() {
		this.currentConfig.name = this.currentTitle;
		console.log('>>>>>emit mixin')
		this.$emit('ok', this.currentConfig);
	  },
	  handleCancel() {
		this.$emit('cancel');
	  },
	  titleUpdated(val) {
		if (val !== this.currentTitle) this.currentTitle = val;
		console.log('>>>>tconf title updated', this.currentTitle)
	  },
	  configUpdated(val) {
		if (val !== this.currentConfig) this.currentConfig.title = val;
		console.log('>>>>tconf updated', this.currentConfig)
	  },
	},
	props: {
	  config: {
		type: Object,
		default: () => ({ name: 'bbb2' }),
	  },
	  title: {
		type: String,
		default: 'bbb',
	  },
	},
  };
  