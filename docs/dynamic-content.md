# 动态资料配置

主页由 GitHub Actions 定时生成 GitHub 和 Steam 的快照。脚本只读取公开的 GitHub 资料，以及 Steam 的“最近玩过的游戏”数据；它不会查询当前在线状态或个人资料摘要，因此页面不会宣称正在游戏。

## Secrets

在仓库的 **Settings → Secrets and variables → Actions** 中添加以下两个仓库级 Actions secrets：

- `STEAM_API_KEY`：Steam Web API key。
- `STEAM_ID`：17 位 Steam ID64，例如 `76561198000000000`。

两个值都配置后，Steam 数据才会请求。缺少任意一个或格式不正确时，页面显示等待/不可用状态；没有伪造的游戏时长。Steam 个人资料的游戏详情必须设置为 **Public**，否则 API 只能返回不可用或空数据。

GitHub 使用 Actions 自动提供的标准 `GITHUB_TOKEN`；不需要也不要为此功能添加自定义个人 GitHub token。

## Refresh schedule

工作流名称是 **Refresh profile**，默认每 6 小时运行一次，UTC 时间每次在第 17 分钟开始（`17 */6 * * *`）。工作流也支持 Actions 页面中的 **Run workflow** 手动运行。生成结果包含 `assets/github.svg`、`assets/steam.svg` 和 README 中可访问的详情摘要。

## Data sources

- [GitHub Users API](https://docs.github.com/en/rest/users/users#get-a-user)
- [GitHub Repositories API](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user)
- [Steam GetRecentlyPlayedGames](https://partner.steamgames.com/doc/webapi/IPlayerService#GetRecentlyPlayedGames)

GitHub 的 stars 只统计该用户拥有的公开、非 fork 仓库；活动列表再排除 archived 仓库。Steam 总分钟数是接口返回的最近两周分钟数之和，列表取最近两周分钟数最高的 3 个游戏。所有时间戳以 UTC ISO 8601 格式保存。

## 第一次启用

将改动提交到仓库默认分支后，在 **Actions** 页面启用工作流，并手动运行一次 **Refresh profile**。这个仓库是 fork，GitHub 可能默认禁用定时工作流，需要先在 Actions 页面启用。工作流只提交生成的 SVG 和 README，不需要安装项目依赖或部署 Vercel。

脚本每次会生成桌面和手机两套卡片：`assets/header.svg`、`assets/github.svg`、`assets/steam.svg` 及各自的 `-mobile.svg` 文件。README 的 `PROFILE:START` / `PROFILE:END` 之间会自动生成完整文字详情；手写介绍和其他区域不会被覆盖。

本地使用 Node.js 22 或更新版本：

```sh
npm run profile:update
npm run profile:check
```

`profile:update` 会读取公开 GitHub 数据，并按环境变量选择是否读取 Steam。`profile:check` 是离线检查，不会请求接口或改变文件。GitHub 请求失败时本次更新失败，保留上次快照；Steam 请求失败时展示不可用状态，GitHub 仍可更新。

游戏时长以接口的分钟值读取，再除以 60 展示为小时，保留一位小数。空数据既可能是近期没有游戏，也可能与隐私设置有关，主页不会据此断言你没有玩游戏。Steam 的真实账号调用要等上述两个 secret 配好后验证；目前已验证数据格式处理和无密钥状态，未使用示例数据冒充真实游戏记录。

定时任务由 GitHub 调度，可能延迟；公开仓库长期无活动时也可能自动停用。图片经 GitHub 缓存，更新后的展示可能稍有延迟。仓库里的历史 Spotify/Vercel 接口仍保留，但新主页不引用它们，新功能也不依赖它们。
