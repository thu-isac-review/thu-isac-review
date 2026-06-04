import { render as renderApp } from '../../components/InstitutionTable/main.js';

export async function render(containerId, context) {
    // 進入唯讀瀏覽模式 (拔除新增/編輯功能，isReadOnly: true)
    await renderApp(containerId, { ...context, isReadOnly: true });
}
