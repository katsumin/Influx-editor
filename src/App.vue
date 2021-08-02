<template>
  <InfluxView host="35.192.172.106" />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import InfluxView from "./components/InfluxView.vue";

export default defineComponent({
  name: "App",
  components: {
    InfluxView,
  },
});
</script>

<style lang="scss">
@import "@/../node_modules/bulma/bulma.sass";
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
