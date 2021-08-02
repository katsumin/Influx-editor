<template>
  <div class="Pagination">
    <div
      class="pagination is-centered is-fix-bottom"
      role="navigation"
      aria-label="pagination"
    >
      <button
        class="pagination-previous button is-outlined"
        @click="update(cur - 1)"
        v-bind="{ disabled: isDisablePrev }"
      >
        Previous
      </button>
      <button
        class="pagination-next button is-outlined"
        @click="update(cur + 1)"
        v-bind="{ disabled: isDisableNext }"
      >
        Next page
      </button>
      <ul class="pagination-list">
        <li>
          <a
            class="pagination-link"
            aria-label="Goto page 1"
            @click="update(1)"
            v-bind:class="{ 'is-current': isCurrent(1) }"
            >1</a
          >
        </li>
        <li v-if="lowerEllipsis">
          <span class="pagination-ellipsis">&hellip;</span>
        </li>
        <li v-for="(mp, k) in middlePages" :key="k">
          <a
            class="pagination-link"
            v-bind="{ 'aria-label': labelGotoPage(mp) }"
            @click="update(mp)"
            v-bind:class="{ 'is-current': isCurrent(mp) }"
            >{{ mp }}</a
          >
        </li>
        <li v-if="higherEllipsis">
          <span class="pagination-ellipsis">&hellip;</span>
        </li>
        <li v-if="isDisableMax">
          <a
            class="pagination-link"
            v-bind="{ 'aria-label': labelGotoPage(max) }"
            @click="update(max)"
            v-bind:class="{ 'is-current': isCurrent(max) }"
            >{{ max }}</a
          >
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, Ref, watch, computed } from "vue";

export default defineComponent({
  name: "Pagination",
  props: {
    curPage: { type: Number, required: true },
    maxPage: { type: Number, required: true },
  },
  emit: ["update-page"],
  setup(props, context) {
    const cur: Ref<number> = ref(props.curPage);
    const max: Ref<number> = ref(props.maxPage);
    let middlePages: Ref<number[]> = ref([]);

    const update = (page: number) => {
      if (0 < page && page <= max.value) {
        cur.value = page;
        middlePages.value = updateMiddlePages(cur.value, max.value);
        console.log(middlePages.value);
        context.emit("update-page", page);
      } else {
        console.log(`page:${page}, max:${max.value}`);
      }
    };

    const updateMiddlePages = (cur: number, max: number): number[] => {
      let pages: number[] = [];
      if (max <= 5) {
        for (let i = 2; i < max; i++) {
          pages.push(i);
        }
      } else {
        // ページ数≧６
        if (cur <= 3) {
          // 現在ページ≦３
          pages = [2, 3, 4];
        } else if (cur > max - 3) {
          // 現在ページ≧最大ページ－２
          pages = [max - 3, max - 2, max - 1];
        } else {
          pages = [cur - 1, cur, cur + 1];
        }
      }
      console.log(pages);
      return pages;
    };
    middlePages.value = updateMiddlePages(cur.value, max.value);

    watch(
      () => props.maxPage,
      (newValue, oldValue) => {
        console.log(`maxPage: ${oldValue} -> ${newValue}`);
        // 親コンポーネントでの値変化を反映
        max.value = newValue;
        // 1ページにリセット
        update(1);
      }
    );

    const labelGotoPage = (page: number): string => {
      return `Goto page ${page}`;
    };
    // 現在ページ
    const isCurrent = (page: number): boolean => {
      return page === cur.value;
    };
    // 前ページ
    const isDisablePrev = computed((): boolean => {
      return cur.value <= 1;
    });
    // 次ページ
    const isDisableNext = computed((): boolean => {
      return cur.value >= max.value;
    });
    // 最大ページ
    const isDisableMax = computed((): boolean => {
      return max.value >= 2;
    });
    // 省略記号（下）
    const lowerEllipsis = computed((): boolean => {
      const enable = max.value >= 6 && cur.value >= 4;
      return enable;
    });
    // 省略記号（上）
    const higherEllipsis = computed((): boolean => {
      const enable = max.value >= 6 && max.value - cur.value >= 3;
      return enable;
    });

    return {
      cur,
      max,
      middlePages,
      // methods
      update,
      // computed
      isCurrent,
      labelGotoPage,
      isDisablePrev,
      isDisableNext,
      isDisableMax,
      lowerEllipsis,
      higherEllipsis,
    };
  },
});
</script>

<style>
.Pagination {
  flex: 1;
  margin-right: 5px;
}
</style>
