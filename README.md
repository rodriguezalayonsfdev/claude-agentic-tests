# Salesforce Claude Platform Lab

A Salesforce DX starter project for safely experimenting with Claude Platform features from Apex and Lightning Web Components.

> This repository is intended for development and testing only. Do not use production customer data, credentials, or unrestricted Salesforce actions.

## Goals

This project provides a foundation for testing:

- Claude Messages API callouts from Apex
- Multi-turn conversations
- System prompts and reusable prompt templates
- JSON response contracts
- Client-side tool use
- Prompt caching
- Token usage and latency tracking
- Error handling, retries, and API limits
- Lightning Web Component chat interfaces
- Mocked Apex tests without real API calls

## Architecture

```text
Lightning Web Component
        |
        v
Apex Controller
        |
        v
Claude Service
        |
        v
Salesforce Named Credential
        |
        v
Anthropic Messages API
```

API keys must remain in Salesforce credentials. Never store them in Apex, JavaScript, Custom Metadata, source control, or debug logs.

## Suggested Project Structure

```text
force-app/main/default/
├── classes/
│   ├── ClaudeController.cls
│   ├── ClaudeController.cls-meta.xml
│   ├── ClaudeService.cls
│   ├── ClaudeService.cls-meta.xml
│   ├── ClaudeServiceTest.cls
│   ├── ClaudeServiceTest.cls-meta.xml
│   ├── ClaudeHttpMock.cls
│   └── ClaudeHttpMock.cls-meta.xml
├── customMetadata/
│   └── Claude_Settings.Default.md-meta.xml
├── customPermissions/
│   └── Use_Claude_AI.customPermission-meta.xml
├── lwc/
│   └── claudePlayground/
│       ├── claudePlayground.html
│       ├── claudePlayground.js
│       ├── claudePlayground.css
│       └── claudePlayground.js-meta.xml
├── namedCredentials/
│   └── Anthropic.namedCredential-meta.xml
└── permissionsets/
    └── Claude_Platform_User.permissionset-meta.xml
```

## Prerequisites

- A Salesforce Developer Edition, scratch org, or sandbox
- Salesforce CLI (`sf`)
- An Anthropic Console account and API key
- Git
- Node.js, if the project includes LWC linting or Jest tests

Check the CLI:

```bash
sf --version
```

## Create or Connect an Org

Log in to an existing Developer Edition:

```bash
sf org login web --alias claude-dev --set-default
```

Confirm the connection:

```bash
sf org display --target-org claude-dev
```

If the repository includes a scratch-org definition:

```bash
sf org create scratch \
  --definition-file config/project-scratch-def.json \
  --alias claude-scratch \
  --duration-days 7 \
  --set-default
```

## Configure the Anthropic Credential

In Salesforce Setup:

1. Open **Named Credentials**.
2. Create an **External Credential** named `Anthropic`.
3. Configure a named principal for the test users.
4. Store the Anthropic API key as a protected authentication value.
5. Add the API key to the outgoing `x-api-key` header.
6. Create a **Named Credential** named `Anthropic`.
7. Set its base URL to:

   ```text
   https://api.anthropic.com
   ```

8. Configure the required headers:

   ```text
   Content-Type: application/json
   anthropic-version: 2023-06-01
   ```

9. Grant the external credential principal to users through the `Claude_Platform_User` permission set.

Credential configuration can vary by Salesforce release. Follow the current Salesforce Named Credentials documentation if the Setup labels differ.

## Runtime Configuration

Keep non-secret settings in Custom Metadata:

| Setting | Example | Description |
|---|---|---|
| Model | `your-enabled-model-id` | Model available to your Anthropic account |
| Maximum output tokens | `1024` | Upper response limit |
| Temperature | `0` | Optional sampling control |
| Timeout | `60000` | HTTP timeout in milliseconds |
| Logging enabled | `false` | Logs sanitized metadata only |

Do not hard-code a model identifier. Model availability and identifiers change over time.

## Basic Apex Callout

The service should send requests to the Messages API through the Named Credential:

```apex
HttpRequest request = new HttpRequest();
request.setEndpoint('callout:Anthropic/v1/messages');
request.setMethod('POST');
request.setHeader('Content-Type', 'application/json');
request.setHeader('anthropic-version', '2023-06-01');
request.setTimeout(60000);
request.setBody(JSON.serialize(requestBody));

HttpResponse response = new Http().send(request);
```

The API key header should be injected by the configured credential rather than Apex.

## Example Request Body

```json
{
  "model": "your-enabled-model-id",
  "max_tokens": 1024,
  "system": "You are a Salesforce development assistant. Return concise and technically accurate answers.",
  "messages": [
    {
      "role": "user",
      "content": "Explain when to use Queueable Apex."
    }
  ]
}
```

## Tool-Use Experiment

A safe first tool is a read-only Account search:

```json
{
  "name": "find_accounts",
  "description": "Find Salesforce Accounts whose names contain the supplied text.",
  "input_schema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Partial Account name"
      },
      "limit": {
        "type": "integer",
        "minimum": 1,
        "maximum": 10
      }
    },
    "required": ["name"]
  }
}
```

The application—not Claude—must execute tools. Before execution:

1. Match the requested tool against an allowlist.
2. Validate every input against its schema.
3. Enforce CRUD, field-level security, and record sharing.
4. Apply strict query and result limits.
5. Require explicit user confirmation before write operations.
6. Return only the minimum data necessary.
7. Never execute generated Apex, SOQL, URLs, or shell commands directly.

Start with read-only tools. Add create, update, or delete tools only after implementing confirmation and audit controls.

## Deploy

Deploy the source:

```bash
sf project deploy start \
  --source-dir force-app \
  --target-org claude-dev
```

Assign the permission set:

```bash
sf org assign permset \
  --name Claude_Platform_User \
  --target-org claude-dev
```

Open the org:

```bash
sf org open --target-org claude-dev
```

## Testing

Apex tests must use `HttpCalloutMock`. Automated tests must never call the live Anthropic API.

Run all local tests:

```bash
sf apex run test \
  --test-level RunLocalTests \
  --target-org claude-dev \
  --wait 20 \
  --result-format human
```

Recommended test cases:

- Successful text response
- Multiple content blocks
- Tool-use response
- Malformed JSON
- Empty response content
- HTTP 400 authentication or validation error
- HTTP 429 rate limit
- HTTP 500 service error
- Callout timeout
- Missing configuration
- Unauthorized Salesforce user
- Tool inputs outside the allowed schema
- CRUD, FLS, and sharing enforcement
- Prompt and response size limits
- Sensitive-data redaction

## Manual Test Matrix

| Experiment | Expected result |
|---|---|
| Basic prompt | A text response appears in the LWC |
| System prompt | The configured behavior is followed |
| JSON contract | Response can be parsed and validated |
| Multi-turn chat | Relevant conversation context is retained |
| Tool request | Only an allowlisted tool can run |
| Invalid tool arguments | Execution is rejected |
| Rate limit | A useful retry message is shown |
| Missing permission | The request is blocked |
| Prompt caching | Repeated static context reports cache usage |
| Large input | Application rejects or truncates it safely |

## Observability

Capture sanitized operational metadata such as:

- Request timestamp
- Salesforce user ID
- Feature or prompt-template name
- Model identifier
- HTTP status
- Request duration
- Input and output token counts
- Stop reason
- Tool name
- Correlation ID
- Sanitized error category

Do not log:

- API keys
- Authorization headers
- Complete prompts or responses by default
- Customer personal data
- Salesforce session IDs
- Credential values

## Salesforce Limits

Design around Salesforce governor limits:

- Callouts require an asynchronous pattern when triggered by database automation.
- Do not perform callouts after uncommitted DML.
- Bulk-triggered work should be aggregated and queued.
- Long-running or streaming workloads are better handled by middleware or Salesforce Functions.
- Keep payloads within Apex heap and HTTP request/response limits.
- Use Queueable Apex for controlled asynchronous processing.

Apex is suitable for ordinary request/response experiments. For real-time token streaming, high-volume batch processing, or long-running agent loops, use an external service and return results to Salesforce asynchronously.

## Security Checklist

- [ ] API key stored only in an External/Named Credential
- [ ] Credential principal restricted by permission set
- [ ] Custom permission checked before every request
- [ ] `with sharing` or inherited sharing used appropriately
- [ ] CRUD and field-level security enforced
- [ ] User input length limited
- [ ] Tool names allowlisted
- [ ] Tool arguments schema-validated
- [ ] Write operations require confirmation
- [ ] Prompts and responses excluded from normal debug logs
- [ ] Production data prohibited during experiments
- [ ] API usage and cost monitored
- [ ] Kill switch available through configuration

## Suggested Milestones

1. Implement a mocked `ClaudeService` test.
2. Make one authenticated Messages API call from Anonymous Apex.
3. Add the LWC playground.
4. Add JSON response validation.
5. Add one read-only Salesforce tool.
6. Add multi-turn conversation storage.
7. Add sanitized usage telemetry.
8. Evaluate prompt caching.
9. Add asynchronous processing.
10. Complete a security review before enabling write tools.

## Documentation

- [Claude API overview](https://docs.anthropic.com/en/api/overview)
- [Claude Messages API](https://docs.anthropic.com/en/api/messages)
- [Tool use with Claude](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview)
- [Prompt engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [Salesforce Named Credentials](https://developer.salesforce.com/docs/platform/named-credentials/guide/get-started.html)
- [Salesforce Apex callouts](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_callouts.htm)
- [Salesforce DX project development](https://developer.salesforce.com/tools/salesforcecli)

## Disclaimer

This project is an experimental starter and is not production-ready. Review the current Anthropic and Salesforce documentation, security requirements, API limits, pricing, and data-handling policies before using it with real organizational data.
