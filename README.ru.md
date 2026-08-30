# <img src="./assets/a1-logo.svg" alt="A1" width="40"> Google Search Console MCP

[English](./README.md) | **Русский**

[![npm](https://img.shields.io/npm/v/mcp-google-search-console)](https://www.npmjs.com/package/mcp-google-search-console)
[![CI](https://github.com/A1-x-Tech/mcp-google-search-console/actions/workflows/ci.yml/badge.svg)](https://github.com/A1-x-Tech/mcp-google-search-console/actions/workflows/ci.yml)
[![Glama](https://glama.ai/mcp/servers/A1-x-Tech/mcp-google-search-console/badges/score.svg)](https://glama.ai/mcp/servers/A1-x-Tech/mcp-google-search-console)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**A1 Google Search Console MCP** подключает AI-приложение к Google Search Console. Он помогает исследовать поисковую эффективность, проверить индексацию URL, посмотреть sitemap и осознанно отправить или удалить sitemap.

Сервер работает со свойствами, к которым есть доступ у вашего Google-аккаунта. Важная особенность: он использует точное значение свойства Search Console — domain property и URL-prefix property являются разными объектами.

- **12 инструментов.** Семь инструментов читают свойства, поисковые данные, sitemap и статус индексации; два добавляют свойство или отправляют sitemap; три могут удалить данные или вызвать произвольный метод API.
- **Точные ID свойств.** `https://example.com/`, `https://www.example.com/` и `sc-domain:example.com` различаются. `list_sites` показывает значение, которое нужно использовать.
- **Поисковые данные с контекстом.** Можно получить клики, показы, CTR и позицию по дате, странице, запросу, стране, устройству или search appearance.
- **Индексация, а не публикация.** Проверка URL показывает текущий статус Google, но не заставляет страницу попасть в индекс.

Начните с запроса, который только читает данные:

> Покажи 20 самых популярных поисковых запросов для моего свойства за последние 28 дней, с кликами и CTR.

[Подключить сервер](#быстрый-старт) · [Посмотреть сценарии](#что-можно-поручить) · [Открыть техническую документацию](#техническая-документация)

---

## Увидеть работу за минуту

> **Вы:** Проиндексирован ли `https://example.com/pricing`? Если нет, почему?
>
> **Ассистент:** Проверяет URL и показывает вердикт индексации, покрытие, данные обхода и canonical URLs. Ничего не меняется.
>
> **Вы:** Проверь мои sitemap и подготовь повторную отправку того, где есть ошибки.
>
> **Ассистент:** Показывает sitemap, его предупреждения и ошибки, затем запрашивает подтверждение перед повторной отправкой.
>
> **Вы:** Подтверждаю.
>
> **Ассистент:** Повторно отправляет выбранный sitemap. Он не меняет содержимое страницы и не гарантирует индексацию.

## Содержание

- [Быстрый старт](#быстрый-старт)
- [Что можно поручить](#что-можно-поручить)
- [Как устроены свойства Search Console](#как-устроены-свойства-search-console)
- [Что может измениться](#что-может-измениться)
- [Как получить доступ](#как-получить-доступ)
- [Конфигурация](#конфигурация)
- [Данные, лимиты и работа в фоне](#данные-лимиты-и-работа-в-фоне)
- [Техническая документация](#техническая-документация)
- [Поддержка](#поддержка)

## Быстрый старт

Нужны Node.js 20+, Google-аккаунт с доступом к свойству Search Console и OAuth-данные Google Cloud.

1. [Подготовьте OAuth-доступ](#как-получить-доступ).
2. Добавьте сервер в AI-приложение.
3. Начните с запроса, который только читает данные.

<details open><summary><strong>Codex</strong></summary>

<br>

**В приложении:** откройте **Settings → MCP servers**, нажмите **Add server**, выберите **STDIO**, укажите команду `npx -y mcp-google-search-console@latest` и переменные окружения `GOOGLE_SEARCH_CONSOLE_CLIENT_ID`, `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET`, `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN`, затем нажмите **Save**, потом **Restart**.

```bash
codex mcp add google-search-console \
  --env GOOGLE_SEARCH_CONSOLE_CLIENT_ID=your_client_id \
  --env GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=your_client_secret \
  --env GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=your_refresh_token \
  -- npx -y mcp-google-search-console@latest
codex mcp list
```

[Документация Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)

</details>

<details><summary><strong>Claude Code</strong></summary>

<br>

```bash
claude mcp add \
  --env GOOGLE_SEARCH_CONSOLE_CLIENT_ID=your_client_id \
  --env GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=your_client_secret \
  --env GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=your_refresh_token \
  --transport stdio --scope user google-search-console \
  -- npx -y mcp-google-search-console@latest
claude mcp list
```

[Документация Claude Code MCP](https://code.claude.com/docs/en/mcp)

</details>

<details><summary><strong>Claude Desktop</strong></summary>

<br>

Актуальный официальный путь — **Settings → Extensions**. Для пользовательского desktop extension откройте **Advanced settings → Extension Developer → Install Extension…**, выберите файл `.mcpb` и следуйте подсказкам.

Этот репозиторий сейчас публикует npm-пакет со stdio и пока не содержит `.mcpb`. Поэтому используйте приведённый ниже JSON stdio-конфиг как fallback только в сборках Claude Desktop, где ещё поддерживается локальная конфигурация:

```json
{"mcpServers":{"google-search-console":{"command":"npx","args":["-y","mcp-google-search-console@latest"],"env":{"GOOGLE_SEARCH_CONSOLE_CLIENT_ID":"your_client_id","GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET":"your_client_secret","GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN":"your_refresh_token"}}}}
```

В таких сборках сохраните его в `~/Library/Application Support/Claude/claude_desktop_config.json` на macOS или `%APPDATA%\Claude\claude_desktop_config.json` на Windows.

[Документация Claude Desktop MCP](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)

</details>

<details><summary><strong>Cursor</strong></summary>

<br>

Добавьте в `~/.cursor/mcp.json` на macOS/Linux или `%USERPROFILE%\.cursor\mcp.json` на Windows:

```json
{"mcpServers":{"google-search-console":{"type":"stdio","command":"npx","args":["-y","mcp-google-search-console@latest"],"env":{"GOOGLE_SEARCH_CONSOLE_CLIENT_ID":"your_client_id","GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET":"your_client_secret","GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN":"your_refresh_token"}}}}
```

[Документация Cursor MCP](https://cursor.com/docs/mcp)

</details>

<details><summary><strong>VS Code</strong></summary>

<br>

Запустите **MCP: Open User Configuration** и добавьте:

```json
{"servers":{"google-search-console":{"type":"stdio","command":"npx","args":["-y","mcp-google-search-console@latest"],"env":{"GOOGLE_SEARCH_CONSOLE_CLIENT_ID":"${input:gsc_client_id}","GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET":"${input:gsc_client_secret}","GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN":"${input:gsc_refresh_token}"}}},"inputs":[{"type":"promptString","id":"gsc_client_id","description":"Google OAuth client ID"},{"type":"promptString","id":"gsc_client_secret","description":"Google OAuth client secret","password":true},{"type":"promptString","id":"gsc_refresh_token","description":"Google OAuth refresh token","password":true}]}
```

Проверьте сервер командой **MCP: List Servers**. [Документация VS Code MCP](https://code.visualstudio.com/docs/agent-customization/mcp-servers)

</details>

## Что можно поручить

### Найти поисковые возможности

- Какие запросы и страницы принесли больше всего кликов в этом месяце?
- Какие страницы потеряли клики по сравнению с прошлым периодом?
- Покажи запросы с `mcp`, где средняя позиция ниже 10.

### Проверить индексацию и sitemap

- Проиндексирован ли этот URL? Покажи покрытие, обход и canonical information.
- В каких отправленных sitemap есть ошибки или предупреждения?
- Повторно отправь этот sitemap, сначала показав его текущий статус.

### Аккуратно управлять свойствами

- Покажи свойства Search Console, к которым у меня есть доступ.
- Добавь это точное значение свойства; подтверждение владения я пройду отдельно.
- Удали это свойство из аккаунта после подтверждения.

## Как устроены свойства Search Console

URL-prefix property должен содержать протокол и завершающий слеш: например, `https://example.com/`. Domain property записывается как `sc-domain:example.com`. Почти совпадающее значение вернёт 403 или 404, поэтому используйте точное значение от `list_sites`.

`add_site` только регистрирует свойство. Подтверждение владения остаётся в интерфейсе Search Console или Site Verification API. Поисковые данные используют тихоокеанское время; `end_date` включительно, а финальные данные обычно отстают на два–три дня. `data_state: "all"` может включить более свежие, но меняющиеся строки.

## Что может измениться

| Операция | Что происходит | Граница подтверждения |
|---|---|---|
| Просмотр свойств, аналитики, sitemap и статуса URL | Читает данные Search Console | Ничего не меняет |
| Добавление свойства | Добавляет запись свойства, но не подтверждает его | Меняет доступ аккаунта |
| Отправка или повторная отправка sitemap | Запрашивает обработку sitemap | Меняет состояние Search Console |
| Удаление свойства | Отвязывает свойство от аккаунта; данные Google не удаляются | Разрушительно |
| Удаление sitemap | Удаляет отправленный sitemap | Разрушительно |
| Технический запрос API | Может вызвать endpoint записи или удаления | Потенциально разрушительно |

Как AI-приложение спрашивает подтверждение, определяет само приложение. Сервер помечает чтение, запись и удаление, чтобы оно отличило проверку от изменения.

## Как получить доступ

Для данных Search Console нужен Google OAuth 2.0: API-ключа недостаточно.

1. Создайте или выберите проект Google Cloud и включите **Google Search Console API**.
2. Настройте OAuth consent screen и создайте OAuth-клиент типа **Desktop app**.
3. Через [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) с включённым **Use your own OAuth credentials** авторизуйте Google-аккаунт с доступом к свойствам и получите refresh token.
4. Используйте `https://www.googleapis.com/auth/webmasters` для sitemap и изменения свойств. `https://www.googleapis.com/auth/webmasters.readonly` подходит, только если нужен намеренно read-only доступ.

Refresh token OAuth-приложения в режиме Testing может истечь через семь дней. Для долгого доступа опубликуйте приложение или используйте Internal-приложение Workspace. Храните client secret и refresh token как пароли.

## Конфигурация

| Переменная | Обязательна | Описание |
|---|---|---|
| `GOOGLE_SEARCH_CONSOLE_CLIENT_ID` | Да* | OAuth client ID. |
| `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` | Да* | OAuth client secret. |
| `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN` | Да* | OAuth refresh token. |
| `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN` | Да* | Короткоживущая альтернатива OAuth-тройке. |
| `GOOGLE_SEARCH_CONSOLE_API_BASE` | Нет | Переопределяет базовый URL API. |
| `GOOGLE_SEARCH_CONSOLE_TIMEOUT_MS` | Нет | Тайм-аут запроса; по умолчанию `60000` мс. |
| `GOOGLE_SEARCH_CONSOLE_MAX_RETRIES` | Нет | Повторы временных ошибок; по умолчанию `3`. |

\* Передайте OAuth-тройку или access token.

## Данные, лимиты и работа в фоне

- **Приватность.** Локальный сервер вызывает Google и отправляет анонимную телеметрию с ID установки, версиями и именами инструментов — но не OAuth-токены, данные свойств, аргументы или промпты. Чтобы отключить её, задайте `ASKADS_TELEMETRY=0`.
- **Лимиты API.** URL inspection разрешает 2 000 проверок на свойство в сутки и 600 в минуту. Analytics возвращает максимум 25 000 строк за вызов; анонимизированные long-tail запросы никогда не возвращаются. Используйте пагинацию и не проверяйте сайт URL за URL.
- **Постоянного наблюдения нет.** Сервер работает только при вызове. Если AI-приложение поддерживает задания по расписанию, оно может периодически проверять sitemap или важный URL.

## Техническая документация

- [Каталог MCP-возможностей](./docs/capabilities/index.md) — страницы по пользовательским задачам для каждого инструмента.
- [Все инструменты и параметры](./docs/TOOLS.md)
- [Документация по разработке](./docs/DEVELOPMENT.md)
- [Документация по публикации](./docs/PUBLISHING.md)
- [Google Search Console API](https://developers.google.com/webmaster-tools)

## Поддержка

Нашли ошибку или не хватает сценария? [Создайте issue](https://github.com/A1-x-Tech/mcp-google-search-console/issues) или напишите в [Telegram](https://t.me/a1_mcp).

<br>

<p align="center">
  <img src="https://github.com/ztemerbekov/a1-yandex-kit-skills/raw/main/assets/images/mona-hifive-yandex-kit-warm.gif" alt="Две Моны дают пять" width="256">
</p>

<p align="center">
  Вы дочитали до конца!
</p>
