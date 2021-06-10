<template>
  <div class="InfluxView">
    <div class="hero is-info">
      <div class="hero-body">
        <p class="title">InfluxEditor</p>
      </div>
    </div>
    <div class="level">
      <div class="level-left">
        <div class="level-item">
          <div class="field has-addons">
            <div class="control">
              <div class="input is-primary">host</div>
            </div>
            <div class="control">
              <input
                class="input is-primary"
                type="text"
                v-model="targetHost"
                @change="changeHost"
              />
            </div>
            <p class="control">
              <button
                @click="connect()"
                class="button is-primary"
                v-bind="{ disabled: connected }"
              >
                <i class="mdi mdi-connection button-icon"></i>
              </button>
            </p>
          </div>
        </div>
        <div class="level-item">
          <div class="field has-addons">
            <div class="control">
              <div class="input is-primary">database</div>
            </div>
            <div class="control">
              <select
                v-model="targetDatabase"
                @change="selectDatabase"
                class="select is-primary input"
                v-bind="{ disabled: !hasDatabases }"
              >
                <option disabled value="">Please select one</option>
                <option
                  v-for="(database, key) in databases"
                  :value="database"
                  :key="key"
                >
                  {{ database }}
                </option>
              </select>
            </div>
          </div>
        </div>
        <div class="level-item">
          <div class="field has-addons">
            <div class="control">
              <div class="input is-primary">measurement</div>
            </div>
            <div class="control">
              <select
                v-model="targetMeasure"
                @change="selectMeasure"
                class="select is-primary input"
                v-bind="{ disabled: !hasMeasures }"
              >
                <option disabled value="">Please select one</option>
                <option
                  v-for="(measure, key) in measures"
                  :value="measure"
                  :key="key"
                >
                  {{ measure }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="level-right influx-query">
        <transition name="fade" @after-leave="fadeouted">
          <p class="influx-statement influx-message" v-show="changeQuery">
            {{ query }}
          </p>
        </transition>
        <transition name="fade" @after-leave="fadeouted">
          <p class="influx-error influx-message" v-show="occurError">
            {{ error }}
          </p>
        </transition>
        <div class="level-item">
          <div class="field has-addons">
            <div class="control">
              <div class="input is-primary">order by</div>
            </div>
            <div class="control">
              <select v-model="orderby" class="select is-primary input">
                <option v-for="(s, k) in ['desc', 'asc']" :value="s" :key="k">
                  {{ s }}
                </option>
              </select>
            </div>
          </div>
        </div>
        <div class="level-item">
          <div class="field has-addons">
            <div class="control">
              <div class="input is-primary">limit</div>
            </div>
            <div class="control">
              <input
                type="number"
                min="1"
                v-model="limit"
                class="input is-primary limit-input"
              />
            </div>
          </div>
        </div>
        <div class="level-item">
          <div class="field has-addons">
            <p class="control">
              <input
                class="input is-primary"
                type="text"
                placeholder="Search statement"
                v-model="targetWhere"
              />
            </p>
            <p class="control">
              <button
                @click="update()"
                class="button is-primary"
                v-bind="{ disabled: disableUpdate }"
              >
                <i class="mdi mdi-reload button-icon"></i>
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
    <div v-show="loading">
      <div class="flower-spinner">
        <div class="dots-container">
          <div class="bigger-dot">
            <div class="smaller-dot"></div>
          </div>
        </div>
      </div>
    </div>
    <div v-show="!loading">
      <RecordTable
        :records="records"
        :taglist="tagList"
        :measure="targetMeasure"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, computed, Ref, watch } from "vue";
import { RecordModel } from "@/components/influx/Record.vue";
import { InfluxDB, IResults } from "influx";
import RecordTable from "@/components/influx/RecordTable.vue";

// interface TagInfo {
//   view: boolean;
//   list: string[];
// }

export default defineComponent({
  name: "InfluxView",
  components: {
    RecordTable,
  },
  props: {
    host: { type: String, required: true },
    port: { type: Number, required: false, default: 8086 },
  },
  setup(props) {
    const targetHost: Ref<string> = ref(props.host); // 接続先ホスト名
    const targetPort: Ref<number> = ref(props.port); // 接続先ポート番号
    const targetDatabase: Ref<string> = ref(""); // 接続先データベース名
    const targetMeasure: Ref<string> = ref(""); // 接続先Measure名
    const databases: Ref<string[]> = ref([]); // データベース名リスト
    const measures: Ref<string[]> = ref([]); // Measureリスト
    const records: Ref<RecordModel[]> = ref([]);
    const loading: Ref<boolean> = ref(false);
    const connected: Ref<boolean> = ref(false);
    const targetWhere: Ref<string> = ref(""); // 検索条件
    const orderby: Ref<string> = ref("desc");
    const limit: Ref<string> = ref("10");
    const tagList: Ref<{ [s: string]: string[] }> = ref({});
    let tagNames: string[] = []; // タグ名リスト
    const query: Ref<string> = ref("");
    const changeQuery: Ref<boolean> = ref(false);
    const error: Ref<string> = ref("");
    const occurError: Ref<boolean> = ref(false);

    let influx: InfluxDB;
    const connect = () => {
      console.log(`connect: ${targetHost.value}`);
      influx = new InfluxDB({
        host: targetHost.value,
        port: targetPort.value,
        protocol: "http",
      });
      //   console.log(influx);

      // データベース名リスト取得
      influx
        .getDatabaseNames()
        .then((names: string[]) => {
          databases.value = names;
          console.log(databases);
          connected.value = true;
        })
        .catch((err: string) => {
          // console.log(err)
          displayError(err);
        });
    };

    const generateQuery = (
      measure: string,
      orderby: string,
      limit: string,
      targetWhere: string
    ): string => {
      const l = limit === "" ? "" : ` limit ${limit}`;
      const where = targetWhere === "" ? "" : ` where ${targetWhere}`;
      const query = `select * from "${measure}" ${where} order by time ${orderby}${l}`;
      return query;
    };

    const execQuery = (
      database: string,
      measure: string,
      tagNames: string[],
      orderby: string,
      limit: string,
      targetWhere: string
    ) => {
      const query = generateQuery(measure, orderby, limit, targetWhere);
      console.log(query);
      let fieldsTemp = new Set<string>();
      influx
        .query(query, { database: database })
        .then((results: IResults<any>) => {
          const values: RecordModel[] = [];
          tagList.value = {};
          results.forEach((result, index) => {
            const tags: { [s: string]: string } = {};
            const fields: { [s: string]: string } = {};
            Object.keys(result).forEach((key) => {
              if (key === "time") return;
              if (tagNames.indexOf(key) === -1) {
                fields[key] = result[key];
                fieldsTemp.add(key);
              } else {
                const tag = result[key];
                tags[key] = tag;
                let l = tagList.value[key];
                if (l === undefined) {
                  l = [];
                  tagList.value[key] = l;
                }
                if (l.indexOf(tag) === -1) {
                  l.push(tag);
                }
              }
            });
            const r = new RecordModel(
              String(index + 1),
              result.time,
              fields,
              tags
            );
            values.push(r);
          });
          records.value = values;
          Object.values(tagList.value).forEach((tags) => {
            tags.sort();
          });
          loading.value = false;
        })
        .catch((err: string) => {
          //   console.log(err);
          loading.value = false;
          displayError(err);
        });
    };

    const update = () => {
      loading.value = true;
      execQuery(
        targetDatabase.value,
        targetMeasure.value,
        tagNames,
        orderby.value,
        limit.value,
        targetWhere.value
      );
    };

    const selectDatabase = (event: Event) => {
      event.preventDefault();
      //   console.log(event);
      console.log(`select database: ${targetDatabase.value}`);

      influx
        .getMeasurements(targetDatabase.value)
        .then((results: string[]) => {
          measures.value = results;
        })
        .catch((err: string) => {
          console.log(err);
          displayError(err);
        });
    };

    const selectMeasure = (event: Event) => {
      event.preventDefault();
      console.log(`select measure: ${targetMeasure.value}`);

      loading.value = true;
      console.log(`loading: ${loading.value}`);
      const tagsTemp = new Set<string>();
      influx
        .getSeries({
          measurement: targetMeasure.value,
          database: targetDatabase.value,
        })
        .then((series: string[]) => {
          series.forEach((series) => {
            //
            series.split(",").forEach((key) => {
              //
              if (key === targetMeasure.value) return;
              const tag = key.split("=")[0];
              tagsTemp.add(tag);
            });
          });
          tagNames = Array.from(tagsTemp).sort();
          console.log(tagNames);

          execQuery(
            targetDatabase.value,
            targetMeasure.value,
            tagNames,
            orderby.value,
            limit.value,
            targetWhere.value
          );
        })
        .catch((err: string) => {
          console.log(err);
          loading.value = false;
          displayError(err);
        });
    };

    const changeHost = (event: Event) => {
      event.preventDefault();
      connected.value = false;
    };

    const fadeouted = (el: any) => {
      //   console.log("animated");
      //   console.log(typeof el);
    };

    const hasDatabases = computed(() => {
      return databases.value.length > 0;
    });

    const hasMeasures = computed(() => {
      return measures.value.length > 0;
    });

    const disableUpdate = computed(() => {
      // 更新ボタン禁止＝読み込み中、Measure未選択、
      return loading.value || targetMeasure.value === "";
    });

    const displayQuery = (q: string) => {
      query.value = q;
      changeQuery.value = true;
      setTimeout(() => {
        changeQuery.value = false;
      }, 200);
    };

    const displayError = (err: string) => {
      error.value = err;
      occurError.value = true;
      setTimeout(() => {
        occurError.value = false;
      }, 5000);
    };

    watch(
      () => targetWhere.value,
      (newValue, oldValue) => {
        targetWhere.value = newValue;
        const q = generateQuery(
          targetMeasure.value,
          orderby.value,
          limit.value,
          targetWhere.value
        );
        displayQuery(q);
      }
    );
    watch(
      () => orderby.value,
      (newValue, oldValue) => {
        orderby.value = newValue;
        const q = generateQuery(
          targetMeasure.value,
          orderby.value,
          limit.value,
          targetWhere.value
        );
        // console.log(query);
        displayQuery(q);
      }
    );
    watch(
      () => limit.value,
      (newValue, oldValue) => {
        limit.value = newValue;
        const q = generateQuery(
          targetMeasure.value,
          orderby.value,
          limit.value,
          targetWhere.value
        );
        displayQuery(q);
      }
    );

    return {
      // data
      targetHost,
      records,
      databases,
      measures,
      query,
      changeQuery,
      error,
      occurError,
      //   tagNames,
      targetDatabase,
      targetMeasure,
      loading,
      connected,
      targetWhere,
      orderby,
      limit,
      tagList,
      hasDatabases,
      hasMeasures,
      disableUpdate,
      // イベント
      selectDatabase,
      selectMeasure,
      changeHost,
      fadeouted,
      // メソッド
      connect,
      update,
      // ライフサイクル
      onMounted,
    };
  },
});
</script>

<style scoped>
@import "../css/loading.css";
@import "../../node_modules/@mdi/font/css/materialdesignicons.css";
.limit-input {
  width: 6em;
}
.tag-filter-list {
  font-family: monospace;
  /* z-index: 1; */
  position: fixed;
  background-color: lightsteelblue;
  text-align: left;
}
.record-head {
  background-color: aquamarine;
}
.record-foot {
  background-color: aquamarine;
}
.record-table {
  max-height: 90vh;
  overflow: auto;
}

.influx-query {
  position: relative;
}

.influx-message {
  position: absolute;
  top: 50px;
  right: 50px;
  padding: 10px 16px;
  border-radius: 5px;
  z-index: 2;
  border: 1px solid black;
}

.influx-statement {
  background: aqua;
  color: black;
}

.influx-error {
  background: red;
  color: white;
}

.fade-leave-active {
  transition: opacity 2s ease;
}

.fade-leave-to {
  opacity: 0;
}

.button-icon {
  transform: scale(1.5);
}
</style>
