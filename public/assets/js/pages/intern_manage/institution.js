import { render as renderApp } from '../../components/InstitutionTable/main.js';

export async function render(containerId, context) {
    // 進入管理模式 (擁有完整權限，isReadOnly: false)
    await renderApp(containerId, { ...context, isReadOnly: false });
}
