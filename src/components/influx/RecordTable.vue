<template>
  <div class="RecordTable" v-if="hasRecords" ref="own">
    <div class="control has-icons-left">
      <input
        type="search"
        v-model="filter"
        class="input"
        placeholder="Search for ..."
      />
      <span class="icon is-left">
        <i class="mdi mdi-magnify"></i>
      </span>
    </div>
    <div class="page-control">
      <Pagination
        :curPage="curPage"
        :maxPage="maxPage"
        @update-page="updatePage"
      />
      <div class="field has-addons">
        <div class="control">
          <div class="input is-primary">lines</div>
        </div>
        <div class="control">
          <select class="select is-primary input" v-model="linesAtPage">
            <option v-for="(v, k) in [10, 20, 50, 100]" :value="v" :key="k">
              {{ v }}
            </option>
          </select>
        </div>
        <div class="control">
          <button @click="download()" class="button is-primary">
            <i class="mdi mdi-file-download-outline button-icon"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="table-container record-table-wrapper">
      <table class="table is-fullwidth is-hoverable is-striped is-bordered">
        <thead class="record-head">
          <tr>
            <th rowspan="2" class="is-vcentered record-column">id</th>
            <th rowspan="2" class="is-vcentered record-column">time</th>
            <th
              v-bind="{ colspan: internalTags.length }"
              v-if="internalTags.length > 0"
              class="record-column"
            >
              tag
            </th>
            <th
              v-bind="{ colspan: internalFields.length }"
              class="record-column"
            >
              field
            </th>
          </tr>
          <tr>
            <th
              v-for="(tagName, key) in internalTags"
              :key="key"
              class="record-column"
            >
              <div @click="focusTag(tagName)">
                {{ tagName }}
              </div>
              <div v-if="tagName === focusedTag" class="tag-filter-list">
                <div v-for="(tag, key2) in tagList[tagName]" :key="key2">
                  <input
                    type="checkbox"
                    v-bind="{ id: key2 }"
                    :value="tag"
                    v-model="selectedTags"
                    @change="checkTag"
                  />
                  <label v-bind="{ for: key2 }">{{ tag }}</label>
                </div>
              </div>
            </th>
            <th
              v-for="(fieldName, key) in internalFields"
              :key="key"
              class="record-column"
            >
              {{ fieldName }}
            </th>
          </tr>
        </thead>
        <tbody>
          <Record v-for="r in recordsAtPage" :key="r" :model="r" />
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  PropType,
  Ref,
  watch,
  computed,
  onMounted,
  onUpdated,
  nextTick,
} from "vue";
import Record, { RecordModel } from "./Record.vue";
import Pagination from "../Pagination.vue";
import { promises as fs } from "fs";

export default defineComponent({
  name: "RecordTable",
  components: {
    Record,
    Pagination,
  },
  props: {
    records: { type: Array as PropType<RecordModel[]>, required: true },
    taglist: {
      type: Object as PropType<{ [s: string]: string[] }>,
      required: true,
    },
    measure: { type: String, required: true },
  },
  setup(props) {
    const filteredRecords: Ref<RecordModel[]> = ref(props.records);
    const internalTags: Ref<string[]> = ref([]);
    const internalFields: Ref<string[]> = ref([]);
    const curPage: Ref<number> = ref(1);
    const maxPage: Ref<number> = ref(1);
    const linesAtPage: Ref<number> = ref(10);
    const filter: Ref<string> = ref("");
    const focusedTag: Ref<string> = ref("");
    const tagList: Ref<{ [s: string]: string[] }> = ref(props.taglist);
    const selectedTags: Ref<string[]> = ref([]);
    const own: Ref<any> = ref(null);

    const generateFilteredRecords = (filter: string): RecordModel[] => {
      const src = props.records;
      const filtered =
        filter !== ""
          ? src.filter((r, index, ar) => {
              if (r.time.toISOString().indexOf(filter) !== -1) return true;
              if (
                focusedTag.value !== "" &&
                selectedTags.value.indexOf(r.tags[focusedTag.value]) !== -1
              )
                return true;
              const tags = Object.values(r.tags);
              const fields = Object.values(r.fields);
              for (const t of tags) {
                if (t.indexOf(filter) !== -1) return true;
              }
              for (const t of fields) {
                if (String(t).indexOf(filter) !== -1) return true;
              }
            })
          : src;
      const size = filtered.length;
      console.log(`generateFilteredRecords: ${size}`);
      return filtered;
    };

    watch(
      () => props.records,
      (newValue, oldValue) => {
        console.log("change props.records");
        filteredRecords.value = generateFilteredRecords(filter.value);
        if (props.records.length > 0) {
          internalTags.value = Object.keys(newValue[0].tags);
          internalFields.value = Object.keys(newValue[0].fields);
        }
      }
    );

    watch(
      () => props.taglist,
      (newValue, oldValue) => {
        tagList.value = newValue;
      }
    );

    watch(
      () => filter.value,
      (newValue, oldValue) => {
        filteredRecords.value = generateFilteredRecords(newValue);
      }
    );

    watch(
      () => linesAtPage.value,
      (newValue, oldValue) => {
        console.log(`linesAtPage to: ${newValue}`);
        // ページ当たりの行数を変更
        const values = filteredRecords.value;
        const preLines = oldValue;
        const postLines = newValue;
        const prePos = (curPage.value - 1) * preLines;
        const prePage = curPage.value;
        const preMax = maxPage.value;
        console.log(`prePos: ${prePos}`);
        // ページ数を変更
        maxPage.value =
          Math.floor(values.length / postLines) +
          (values.length % postLines === 0 ? 0 : 1);
        curPage.value = Math.floor(prePos / postLines) + 1;
        console.log(
          `current: ${prePage}/${preMax} -> ${curPage.value}/${maxPage.value}`
        );
        linesAtPage.value = newValue;
      }
    );

    watch(
      () => filteredRecords.value,
      (newValue, oldValue) => {
        console.log("change filteredRecords");
        filteredRecords.value = newValue;
        //
        const values = filteredRecords.value;
        const lines = linesAtPage.value;
        maxPage.value =
          Math.floor(values.length / lines) +
          (values.length % lines === 0 ? 0 : 1);
        curPage.value = 1;
        console.log(
          `size:${newValue.length}, ${curPage.value}/${maxPage.value}`
        );
      }
    );

    watch(
      () => selectedTags.value,
      (newValue, oldValue) => {
        selectedTags.value = newValue;
        filteredRecords.value = generateFilteredRecords(filter.value);
        console.log(filteredRecords.value);
      }
    );

    const hasRecords = computed(() => {
      return props.records.length > 0;
    });

    const recordsAtPage = computed(() => {
      const cur = curPage.value;
      const lines = linesAtPage.value;
      const size = filteredRecords.value.length;

      const start = (cur - 1) * lines;
      const end = Math.min(start + lines, size);
      return filteredRecords.value.slice(start, end);
    });

    const updatePage = (page: number) => {
      curPage.value = page;
      //   console.log(page);
    };

    const focusTag = (tag: string) => {
      console.log(tag);
      if (tag === focusedTag.value) {
        focusedTag.value = "";
      } else {
        focusedTag.value = tag;
      }
      //   console.log(tagList.value[focusedTag.value]);
    };

    const download = () => {
      console.log("download");
      //   const data = JSON.stringify(props.records);
      let data = "";
      props.records.forEach((v, i, ar) => {
        let line = props.measure + ",";
        Object.entries(v.tags).forEach((k, v) => {
          line += `${k[0]}=${k[1]},`;
        });
        line = line.slice(0, line.length - 1);
        line += " ";
        Object.entries(v.fields).forEach((k, v) => {
          line += `${k[0]}=${k[1]},`;
        });
        line = line.slice(0, line.length - 1);
        line += ` ${v.time.getTime()}000000\n`;
        data += line;
      });
      const path = `${props.measure}.txt`;
      const blob = new Blob([data], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const dlObj = document.createElement("a");
      dlObj.href = url;
      dlObj.download = path;
      dlObj.click();
    };

    // onMounted(() => {
    //   console.log("mounted.");
    //   if (own.value !== null) {
    //     const o: HTMLElement = own.value as HTMLElement;
    //     console.log(o);
    //     console.log(o!.clientHeight);
    //   }
    // });

    // onUpdated(() => {
    //   console.log("updated.");
    //   if (own.value !== null) {
    //     console.log(typeof own.value);
    //     const o: HTMLElement = own.value as HTMLElement;
    //     console.log(o);
    //     console.log(o.clientHeight);
    //   }
    //   const e = document.getElementsByClassName("RecordTable");
    //   if (e !== null && e !== undefined) {
    //     console.log(e.item(0));
    //     console.log(e.item(0)!.clientHeight);
    //   }
    // });

    // nextTick(() => {
    //   console.log("nextTick");
    //   if (own.value !== null) {
    //     const o: HTMLElement = own.value as HTMLElement;
    //     console.log(o);
    //     console.log(o.clientHeight);
    //   }
    //   const e = document.getElementsByClassName("RecordTable");
    //   if (e !== null && e !== undefined) {
    //     console.log(e.item(0));
    //     console.log(e.item(0)!.clientHeight);
    //   }
    // });

    return {
      // elements
      own,
      //  data
      filteredRecords,
      curPage,
      maxPage,
      internalTags,
      internalFields,
      linesAtPage,
      filter,
      focusedTag,
      tagList,
      selectedTags,
      // computed
      hasRecords,
      recordsAtPage,
      // event
      focusTag,
      updatePage,
      // method
      download,
    };
  },
});
</script>

<style scoped>
.record-head {
  background-color: aquamarine;
  display: table-header-group;
}

.pagination-sticky {
  position: sticky;
  top: 0px;
  z-index: 2;
  background-color: aliceblue;
}

.record-head th {
  position: -webkit-sticky;
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: aquamarine;
  white-space: nowrap;
}

.record-head tr:nth-child(2) th {
  top: 42px; /* 2行目は1行目の高さの位置に固定する */
}

.record-table-wrapper {
  overflow-y: scroll;
  max-height: calc(100vh - 80px);
  /* z-index: 0; */
}

.table {
  border-collapse: separate;
}

.record-column {
  white-space: nowrap;
  /* border-top: 0px; */
}

.tag-filter-list {
  font-family: monospace;
  position: fixed;
  background-color: lightsteelblue;
  text-align: left;
}

.page-control {
  display: flex;
  justify-content: space-between;
}

.button-icon {
  transform: scale(1.5);
}
</style>
