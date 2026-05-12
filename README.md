# 电子印章生成器

纯前端电子印章 Web 程序，基于 `规范.md` 中的编码与排版要求实现，支持公章、合同章、发票专用章、财务专用章、部门章五类模板。

## 功能清单

- 支持模板切换
- 支持统一修改印章颜色
- 支持实时调整当前模板全部关键参数
- 支持导出透明背景 PNG
- 支持 HTTPS 访问
- 支持 `start` / `stop` 脚本

## 本地启动

```bash
npm install
npm run start
```

启动成功后访问：

```text
http://localhost:5176
```

停止服务：

```bash
npm run stop
```

## 开发命令

```bash
npm run dev
npm run lint
npm run build
```

## 说明

- 前端渲染基于 SVG，确保预览与导出一致
- PNG 导出通过浏览器 Canvas 转换，背景保持透明
- `vite.config.ts` 已固定 `HTTPS + 0.0.0.0 + 5176`
- `scripts/start.sh` 会在后台启动服务并将日志输出到 `.runtime/vite.log`
