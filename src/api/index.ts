import { appendSign } from '@/utils';
import defHttp from '@/utils/http/index';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getRoleInfoApi(data: any) {
   await sleep(1500);

   return defHttp.post({
      url: '/player',
      data: appendSign(data),
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded',
      },
   });
}
export function exchangeCodeApi(data: any) {
   return defHttp.post({
      url: '/gift_code',
      data: appendSign(data),
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded',
      },
   });
}
