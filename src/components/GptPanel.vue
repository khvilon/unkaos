<script>
export default {
  props: {
    context: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      userInput: '',
      result: '',
      panelVisible: false,
      animationVisible: false,
    };
  },
  methods: {
    togglePanel() {
      this.panelVisible = !this.panelVisible;
    },
    async send() {
      this.animationVisible = true;
      alert(this.userInput)
      try {
        const response = await fetch('http://localhost:5010/gpt?userInput=' + this.userInput, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        this.result = JSON.stringify(data, null, 2);
      } catch (error) {
        console.error('Request error:', error);
        this.result = 'Error: Unable to process your request';
      } finally {
        this.animationVisible = false;
      }
    },

    run() {
      console.log('Running function with GPT answer:', this.result);
      // Implement the logic for the "run" function here
    },
  },
};
</script>

<template>
  <div class="gpt-panel panel">
    <div :class="['toggle-panel', panelVisible ? 'open' : 'closed']" @click="togglePanel">
      <i v-if="!panelVisible" class='bx bxs-magic-wand toggle-icon'></i>
      <i v-else class='bx bx-chevron-down toggle-icon'></i>
    </div>
    <transition name="expand">
      <div :class="['gpt-down-panel', panelVisible ? 'open' : 'closed']">
        <TextInput @update_parent_from_input="(v)=>userInput=v" label="Команда произвольным текстом"/>
        <TextInput :class="[animationVisible ? 'gradient-background' : '']" :disabled="true" v-model="result" label="Трактовка ИИ"/> 
        <i @click="send" class='bx bxs-brain'></i>  
        <i @click="run" class='bx bx-play-circle'></i>  
      </div>
    </transition>
  </div>
</template>

<style scoped>
.gpt-panel {
  position: absolute;
  bottom: 0;
  width: 100%;
  left: 0px;
  z-index: 2;
  height: auto;
}

.toggle-panel {
  right: 0;
  bottom: 0;
  width: 100%;
  cursor: pointer;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
}

.toggle-panel.closed {
  width: 30px;
  position: absolute;
  right: 0;
}

.toggle-icon {
  font-size: 20px;
  padding: 3px;
}

.gpt-down-panel {
  overflow: hidden;
  transition: height 0.2s ease;

  padding-left: 25px;
  padding-right: 25px;
}

.gpt-down-panel.open {
  height: 240px;
}

.gpt-down-panel.closed {
  height: 0px;
}

.gpt-down-panel i{
  font-size: 30px;
  padding-top: 15px;
    padding-right: 10px;
    cursor: pointer;
}

.gpt-down-panel textarea {
  width: 100%;
  resize: none;
}

.animation-container {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: rgba(255, 255, 255, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

@keyframes gradient-animation {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.gradient-background  {
  background: linear-gradient(270deg, #3498db, #9b59b6, #f1c40f);
  background-size: 600% 600%;
  animation: gradient-animation 8s ease infinite;
  color: white;
  border: none;
  outline: none;
}


</style>
