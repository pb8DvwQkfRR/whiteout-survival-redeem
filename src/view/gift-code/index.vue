<template>
  <div class="page-title">
    <h2 class="title">WoS Code Redeem</h2>
      <el-tag class="version-tag">v240702</el-tag>
  </div>
  <div class="gift-code">
    <div class="input">
      <el-input v-model.trim="cdk" placeholder="CODE HERE" clearable maxlength="20"></el-input>
      <el-button type="primary" @click="startConfirm" :disabled="!cdk || isLoading">Redeem</el-button>
      <el-upload
          class="upload-ids"
          action=""
          :show-file-list="false"
          :before-upload="handleUpload"
      >
        <el-button>Upload ID</el-button>
      </el-upload>
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
          <el-table-column prop="id" label="ID" width="90px" />
          <el-table-column prop="nickname" label="Name">
            <template #default="scope">
              <div class="name-status">
                <span>{{ scope.row.nickname || '...' }}</span>
                <el-tooltip
                    v-if="scope.row.isCompleted"
                    :content="scope.row.msg || ''"
                    placement="top"
                >
                  <el-icon :color="getStatusColor(scope.row)">
                    <Check v-if="scope.row.getStatus === 0" />
                    <Close v-else-if="scope.row.getStatus === 1 && scope.row.err_code !== 40008" />
                    <Warning v-else-if="scope.row.err_code === 40008" />
                  </el-icon>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="avatar_image" label="Avatar / F Lv" width="150px">
            <template #default="scope">
              <div class="avatar-f-lv">
                <el-image
                    style="width: 50px; height: 50px"
                    :src="scope.row.avatar_image"
                >
                  <template #error>
                    <div class="image-slot" style="width: 50px; height: 50px">
                      <el-icon><IconPicture size="50" /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div
                    class="stove-lv"
                    v-if="stoveLvImageInfo[scope.$index].showImage || stoveLvImageInfo[scope.$index].showNumber"
                >
                  <el-image
                      v-if="stoveLvImageInfo[scope.$index].showImage"
                      style="width: 35px; height: 35px"
                      :src="scope.row.stove_lv_content"
                  >
                    <template #error>
                      <div class="image-slot" style="width: 35px; height: 35px">
                        <el-icon><icon-picture size="35" /></el-icon>
                      </div>
                    </template>
                  </el-image>
                  <span v-if="stoveLvImageInfo[scope.$index].showNumber">
          {{ stoveLvImageInfo[scope.$index].number }}
        </span>
                </div>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { ElLoading, ElTag } from 'element-plus';
import { getRoleInfoApi, exchangeCodeApi } from '@/api';
import { ids } from '@/assets/userData';
import { getTimestamp } from '@/utils';

import { ElNotification } from 'element-plus';
import { Picture as IconPicture, Check, Close, Warning } from '@element-plus/icons-vue';
import './index.less';

const cdk = ref('');
const isLoading = ref(false);
const completedCount = ref(0);
const listContainer = ref(null);
const tableContainer = ref(null);
const loadingContainer = ref(null);
interface Row {
  getStatus: number;
  err_code: number | null;
}
const tableData = ref(
    ids.map((item) => ({
      id: item,
      getStatus: 1,
      nickname: '',
      avatar_image: '',
      stove_lv: '',
      stove_lv_content: '',
      msg: '',
      isCompleted: false,
      err_code: null,
    }))
);

const stoveLvImageInfo = computed(() => {
  return tableData.value.map(row => {
    const stoveLv = Number(row.stove_lv);
    const isMultipleOfFive = stoveLv % 5 === 0;
    let showImage = false;
    let showNumber = false;
    let number = '';

    if (stoveLv < 30) {
      showNumber = stoveLv > 0;
      number = stoveLv > 0 ? stoveLv.toString() : '';
    } else if (stoveLv >= 30 && stoveLv < 35) {
      const extraNumber = stoveLv - 30;
      showNumber = extraNumber >= 1;
      number = extraNumber >= 1 ? `${Number(row.stove_lv_content)} +${extraNumber}` : '';
    } else if (stoveLv >= 35) {
      showImage = true;
      const plusNumber = isMultipleOfFive ? "" : ` +${(stoveLv - 35) % 5}`;
      showNumber = !isMultipleOfFive;
      number = plusNumber;
    }

    return {
      showImage,
      showNumber,
      number,
    };
  });
});

watch(cdk, (newVal) => {
  if (!newVal) {
    isLoading.value = false;
  }
});

onMounted(() => {
  if (!loadingContainer.value) {
    console.error('Loading container is not available.');
  }

  const cachedNames = JSON.parse(localStorage.getItem('cachedNames') || '{}');
  tableData.value.forEach((row, index) => {
    if (cachedNames[row.id]) {
      tableData.value[index].nickname = cachedNames[row.id];
    }
  });
});

function getStatusColor(row: Row) {
  if (row.getStatus === 0) return 'green';
  if (row.err_code === 40008) return 'gray';
  return 'red';
}

async function startConfirm() {
  if (!loadingContainer.value) {
    console.error('Loading container is not available.');
    return;
  }

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
    tableData.value[i].isCompleted = true;

    const cachedNames = JSON.parse(localStorage.getItem('cachedNames') || '{}');
    const currentName = tableData.value[i].nickname;
    if (cachedNames[currentId] !== currentName) {
      cachedNames[currentId] = currentName;
      localStorage.setItem('cachedNames', JSON.stringify(cachedNames));
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
  tableData.value[index].msg = res.msg;
  tableData.value[index].err_code = res.err_code;
  return res;
}

function handleUpload(file: File) {
  if (file.text) {
    file.text().then(processFileContent).catch(console.error);
  } else {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target as FileReader).result as string;
      processFileContent(content);
    };
    reader.onerror = (error) => console.error('Error reading file:', error);
    reader.readAsText(file);
  }
  return false;
}

function processFileContent(content: string) {
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const lines = normalizedContent.split('\n');
  const idsFromFile = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!/^\d+$/.test(trimmedLine) && trimmedLine !== '') {
      ElNotification({
        title: 'Error',
        message: `File invalid. ${trimmedLine} is not a valid ID.`,
        type: 'error',
      });
      return;
    }
    if (trimmedLine !== '') {
      idsFromFile.push(trimmedLine);
    }
  }
  localStorage.removeItem('cachedNames');
  if (idsFromFile.length > 0) {
    ElNotification({
      title: 'Success',
      message: `${idsFromFile.length} IDs added to the list.`,
      type: 'success',
    });
  }

  const newTableData = idsFromFile.map(id => ({
    id,
    getStatus: 1,
    nickname: '',
    avatar_image: '',
    stove_lv: '',
    stove_lv_content: '',
    msg: '',
    isCompleted: false,
    err_code: null,
  }));

  tableData.value = newTableData;
}
</script>
