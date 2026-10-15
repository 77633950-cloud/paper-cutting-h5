/**
 * 设备级匿名用户身份
 *
 * 首次访问时自动生成匿名 ID，存放在 localStorage 中。
 * 不同手机、不同浏览器（含微信内置浏览器）各自拥有独立存储，天然相互隔离；
 * 无需注册、无需手机号，扫码即可使用。
 * 清除浏览器数据 / 微信缓存后会重新生成新身份。
 */
const UID_KEY = 'papercut:uid';

function createUid(): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return `u_${rand}`;
}

export function getUserId(): string {
  try {
    let uid = localStorage.getItem(UID_KEY);
    if (!uid) {
      uid = createUid();
      localStorage.setItem(UID_KEY, uid);
    }
    return uid;
  } catch {
    // 隐私模式 / 存储被禁用时返回会话级临时 ID（本次浏览内仍可用，不落盘）
    return `u_temp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
