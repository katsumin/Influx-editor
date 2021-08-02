<template>
  <tr>
    <td class="record-column">{{ model.id }}</td>
    <td class="record-column">
      {{ internalTime }}
    </td>
    <td v-for="(tag, key) in internalTags" :key="key" class="record-column">
      {{ tag }}
    </td>
    <td v-for="(field, key) in internalFields" :key="key" class="record-column">
      {{ field }}
    </td>
  </tr>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, PropType, computed } from "vue";

export class RecordModel {
  id: string;
  time: Date;
  fields: { [s: string]: string };
  tags: { [s: string]: string };

  constructor(
    id: string,
    time: Date,
    fields: { [s: string]: string },
    tags: { [s: string]: string }
  ) {
    this.id = id;
    this.time = time;
    this.fields = fields;
    this.tags = tags;
  }
}

export default defineComponent({
  name: "Record",
  props: {
    model: { type: Object as PropType<RecordModel>, required: true },
  },
  setup(props) {
    const internalModel = ref(props.model);

    const internalTime = computed(() => {
      return props.model.time.toISOString();
    });

    const internalFields = computed(() => {
      const fields: string[] = [];
      const keys = Object.keys(props.model.fields).sort();
      keys.forEach((key) => {
        fields.push(props.model.fields[key]);
      });
      return fields;
    });

    const internalTags = computed(() => {
      const tags: string[] = [];
      const keys = Object.keys(props.model.tags).sort();
      keys.forEach((key) => {
        tags.push(props.model.tags[key]);
      });
      return tags;
    });

    return {
      internalModel,
      internalTime,
      internalFields,
      internalTags,
      onMounted,
    };
  },
});
</script>

<style scoped lang="scss">
.record-column {
  white-space: nowrap;
  z-index: -1;
}
</style>
