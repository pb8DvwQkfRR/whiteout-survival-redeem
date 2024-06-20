<template>
  <div class="gift-code">
    <div class="input">
      <el-input v-model.trim="cdk" placeholder="CODE HERE" clearable maxlength="20"></el-input>
      <el-button type="primary" @click="startConfirm" :disabled="!cdk || isLoading">Redeem</el-button>
    </div>
    <div class="loading-container" ref="loadingContainer"></div>
    <div class="list" ref="listContainer">
      <div class="table-container" ref="tableContainer">
        <el-table
            :data="tableData"
            style="width: 100%; font-family: var(--el-font-family)"
            border
            stripe
            :cell-style="{ textAlign: 'center' }"
            :header-cell-style="{ 'text-align': 'center' }"
            :row-style="{ height: '60px' }"
        >
          <el-table-column prop="id" label="ID" width="100px" />
          <el-table-column prop="nickname" label="Name">
            <template #default="scope">
              {{ scope.row.nickname || '...' }}
            </template>
          </el-table-column>
          <el-table-column prop="avatar_image" label="Avatar + F Lv" width="150px">
            <template #default="scope">
              <div class="avatar-f-lv">
                <el-image
                    style="width: 50px; height: 50px"
                    :src="scope.row.avatar_image"
                >
                  <template #error>
                    <div class="image-slot" style="width: 50px; height: 50px">
                      <el-icon><icon-picture size="50" /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div class="stove-lv">
                  <template v-if="stoveLvImageInfo[scope.$index].showImage">
                    <el-image
                        style="width: 35px; height: 35px"
                        :src="scope.row.stove_lv_content"
                    >
                      <template #error>
                        <div class="image-slot" style="width: 35px; height: 35px">
                          <el-icon><icon-picture size="35" /></el-icon>
                        </div>
                      </template>
                    </el-image>
                  </template>
                  <template v-else-if="stoveLvImageInfo[scope.$index].showNumber">
                    {{ stoveLvImageInfo[scope.$index].number }}
                  </template>
                  <template v-else>
                    {{ scope.row.stove_lv || '...' }}
                  </template>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="confirmStatus" label="Redeem" width="130px">
            <template #default="scope">
              <el-tag class="ml-2" :type="scope.row.getStatus === 0 ? 'success' : 'info'">
                {{ scope.row.msg || '...' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElNotification, ElLoading } from 'element-plus';
import { getRoleInfoApi, exchangeCodeApi } from '@/api';
import { ids } from '@/assets/userData';
import { getTimestamp } from '@/utils';
import { Picture as IconPicture } from '@element-plus/icons-vue';

const cdk = ref('');
const isLoading = ref(false);
const completedCount = ref(0);
const listContainer = ref(null);
const tableContainer = ref(null);
const loadingContainer = ref(null);

const tableData = ref(
    ids.map((item) => ({
      id: item,
      getStatus: 1,
      nickname: '',
      avatar_image: '',
      stove_lv: '',
      stove_lv_content: '',
      msg: '',
    }))
);

const stoveLvImageInfo = computed(() => {
  return tableData.value.map(row => {
    const isMultipleOfFive = Number(row.stove_lv) % 5 === 0;

    if (Number(row.stove_lv) > 30 && Number(row.stove_lv) < 35) {
      const number = Number(row.stove_lv) - 30;
      return {
        showImage: false,
        showNumber: number >= 1,
        number: number >= 1 ? `${Number(row.stove_lv_content)} +${number}` : '',
      };
    } else if (Number(row.stove_lv) >= 35) {
      const plusNumber = isMultipleOfFive ? "" : ` +${(Number(row.stove_lv) - 35) % 5}`;
      return {
        showImage: true,
        showNumber: !isMultipleOfFive && plusNumber !== "",
        number: plusNumber,
      };
    }

    return {
      showImage: false,
      showNumber: false,
      number: '',
    };
  });
});

watch(cdk, (newVal) => {
  if (!newVal) {
    isLoading.value = false;
  }
});

async function startConfirm() {
  isLoading.value = true;
  completedCount.value = 0;
  const totalIds = tableData.value.length;
  const loading = ElLoading.service({
    target: loadingContainer.value,
    text: `Redeeming... 0/${totalIds}`,
    background: 'rgba(0, 0, 0, 0.1)',
  });

  for (let i = 0; i < totalIds; i++) {
    const currentId = tableData.value[i].id;
    const data = { fid: currentId, time: getTimestamp(), cdk: cdk.value };
    try {
      const loginRes = await getRoleInfo(data, i);
      if (loginRes?.code === 0) {
        await exchangeCode(data, i);
      }
      completedCount.value++;
      loading.setText(`Redeeming... ${completedCount.value}/${totalIds}`);
    } catch (error) {
      console.error(error);
    }
  }

  loading.close();
  isLoading.value = false;
}

async function getRoleInfo(data: any, index: number) {
  const res = await getRoleInfoApi(data);
  const { avatar_image, nickname, stove_lv, stove_lv_content } = res.data;
  tableData.value[index].avatar_image = avatar_image;
  tableData.value[index].nickname = nickname;
  tableData.value[index].stove_lv = stove_lv;
  tableData.value[index].stove_lv_content = stove_lv_content;

  return res;
}

async function exchangeCode(data: any, index: number) {
  const res = await exchangeCodeApi(data);
  tableData.value[index].getStatus = res?.code;
  const msg = res.msg;
  tableData.value[index].msg = msg;
  return res;
}
</script>

<style scoped lang="less">
.gift-code {
  margin: 20px;
}
.input {
  display: flex;
}
.list {
  margin-top: 20px;
  text-align: center;

  .item {
    padding: 10px 0;

    .id {
      margin-left: 20px;
    }
  }
}
.avatar-f-lv {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stove-lv {
  margin-left: 10px;
}
.stove-lv span {
  position: sticky;
  right: 10px;
  bottom: 10px;
  color: #606266;
}
.el-image {
  max-width: 50px;
  max-height: 50px;
  width: 100%;
  height: 100%;
}
.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  font-size: 30px;
}
.image-slot .el-icon {
  font-size: 30px;
}
.table-container {
  overflow-x: auto;
}
.loading-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  z-index: 1000;
  pointer-events: none;
}
</style>
