#!/usr/bin/env bash
set -eo pipefail

print_usage() {
  printf '%s\n' "Usage:"
  printf '%s\n' "  bash path/to/software-factory/execution/scripts/update-context-index.sh \\"
  printf '%s\n' "    --work-order-number <number> [--context-path <path>] [--reset] \\"
  printf '%s\n' "    [--work-order-title \"<title>\"] [--work-order-id <stable-id>] [--status \"<status>\"] \\"
  printf '%s\n' "    [--requirement \"<title>|<id-or-url>\"]... \\"
  printf '%s\n' "    [--blueprint \"<title>|<id-or-url>\"]... \\"
  printf '%s\n' "    [--referenced-blueprint \"<title>|<id-or-url>\"]... \\"
  printf '%s\n' "    [--branch \"<branch>\"] [--pull-request-url \"<url>\"]"
  printf '\n'
  printf '%s\n' "Behavior:"
  printf '%s\n' "  - Creates context.md if it does not exist."
  printf '%s\n' "  - Adds repeated requirement/blueprint values without duplicating exact lines."
  printf '%s\n' "  - Updates Work Order, status, branch, and PR fields when those arguments are provided."
  printf '%s\n' "  - With --reset, rewrites context.md from the provided arguments."
}

WORK_ORDER_NUMBER=""
WORK_ORDER_TITLE=""
WORK_ORDER_ID=""
STATUS=""
BRANCH=""
PULL_REQUEST_URL=""
CONTEXT_PATH=""
RESET=false
REQUIREMENTS=()
BLUEPRINTS=()
REFERENCED_BLUEPRINTS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --work-order-number)
      WORK_ORDER_NUMBER="${2:-}"
      shift 2
      ;;
    --work-order-title)
      WORK_ORDER_TITLE="${2:-}"
      shift 2
      ;;
    --work-order-id)
      WORK_ORDER_ID="${2:-}"
      shift 2
      ;;
    --status)
      STATUS="${2:-}"
      shift 2
      ;;
    --requirement)
      REQUIREMENTS+=("${2:-}")
      shift 2
      ;;
    --blueprint)
      BLUEPRINTS+=("${2:-}")
      shift 2
      ;;
    --referenced-blueprint)
      REFERENCED_BLUEPRINTS+=("${2:-}")
      shift 2
      ;;
    --branch)
      BRANCH="${2:-}"
      shift 2
      ;;
    --pull-request-url)
      PULL_REQUEST_URL="${2:-}"
      shift 2
      ;;
    --context-path)
      CONTEXT_PATH="${2:-}"
      shift 2
      ;;
    --reset)
      RESET=true
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n' "$1" >&2
      print_usage
      exit 1
      ;;
  esac
done

if [[ -z "$WORK_ORDER_NUMBER" ]]; then
  printf '%s\n' "Error: --work-order-number is required." >&2
  print_usage
  exit 1
fi

if [[ -z "$CONTEXT_PATH" ]]; then
  CONTEXT_PATH=".sw-factory/${WORK_ORDER_NUMBER}/context.md"
fi

INITIALIZED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

format_entity_line() {
  local value="$1"
  local title="${value%%|*}"
  local id="${value#*|}"

  if [[ -z "$title" || -z "$id" || "$title" == "$id" ]]; then
    printf 'Error: entity values must use "<title>|<id-or-url>": %s\n' "$value" >&2
    exit 1
  fi

  printf -- '- %s (`%s`)\n' "$title" "$id"
}

print_entities_or_placeholder() {
  local placeholder="$1"
  shift
  local values=("$@")

  if [[ "${#values[@]}" -eq 0 ]]; then
    printf '%s\n' "$placeholder"
    return
  fi

  local value
  for value in "${values[@]}"; do
    format_entity_line "$value"
  done
}

work_order_label_for_number() {
  local n="$1"
  if [[ "$n" != WO-* ]]; then
    n="WO-$n"
  fi
  printf '%s' "$n"
}

work_order_line() {
  local title="$WORK_ORDER_TITLE"
  local id="$WORK_ORDER_ID"
  [[ -n "$title" ]] || title='{{WORK_ORDER_TITLE}}'
  [[ -n "$id" ]] || id='{{WORK_ORDER_ID}}'
  printf -- '- %s: %s (`%s`)\n' "$(work_order_label_for_number "$WORK_ORDER_NUMBER")" "$title" "$id"
}

render_context() {
  local rendered_title="$WORK_ORDER_TITLE"
  local rendered_id="$WORK_ORDER_ID"
  [[ -n "$rendered_title" ]] || rendered_title='{{WORK_ORDER_TITLE}}'
  [[ -n "$rendered_id" ]] || rendered_id='{{WORK_ORDER_ID}}'
  local label
  label="$(work_order_label_for_number "$WORK_ORDER_NUMBER")"

  printf '# Work Order Entity Index: %s\n\n' "$label"
  printf '**Initialized At (UTC):** %s\n' "$INITIALIZED_AT"
  printf '**Current Status:** %s\n\n' "$STATUS"
  printf '## Work Order\n\n'
  printf -- '- %s: %s (`%s`)\n' "$label" "$rendered_title" "$rendered_id"
  printf '\n## Requirements\n\n'
  print_entities_or_placeholder '- {{REQUIREMENTS_DOCUMENT_TITLE}} (`{{REQUIREMENTS_DOCUMENT_ID}}`)' "${REQUIREMENTS[@]}"
  printf '\n## Blueprints\n\n'
  print_entities_or_placeholder '- {{BLUEPRINT_DOCUMENT_TITLE}} (`{{BLUEPRINT_DOCUMENT_ID}}`)' "${BLUEPRINTS[@]}"
  printf '\n## Referenced Blueprints\n\n'
  printf 'Blueprints reached through `@…` mentions and links while reading linked blueprints.\n\n'
  print_entities_or_placeholder '- {{REFERENCED_BLUEPRINT_DOCUMENT_TITLE}} (`{{REFERENCED_BLUEPRINT_DOCUMENT_ID}}`)' "${REFERENCED_BLUEPRINTS[@]}"
  printf '\n## Delivery\n\n'
  printf -- '- Branch: %s\n' "$BRANCH"
  printf -- '- Pull Request URL: %s\n' "$PULL_REQUEST_URL"
}

replace_prefixed_line() {
  local prefix="$1"
  local value="$2"
  local file="$3"
  local tmp
  tmp="$(mktemp)"

  awk -v prefix="$prefix" -v value="$value" '
    index($0, prefix) == 1 { print prefix " " value; next }
    { print }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

remove_placeholder_lines() {
  local file="$1"
  local tmp
  tmp="$(mktemp)"

  awk '
    /{{REQUIREMENTS_DOCUMENT_TITLE}}/ { next }
    /{{BLUEPRINT_DOCUMENT_TITLE}}/ { next }
    /{{REFERENCED_BLUEPRINT_DOCUMENT_TITLE}}/ { next }
    { print }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

replace_work_order_section() {
  local file="$1"
  local line="$2"
  local tmp
  tmp="$(mktemp)"

  awk -v line="$line" '
    $0 == "## Work Order" {
      print
      print ""
      print line
      in_section = 1
      next
    }
    in_section && /^## / {
      in_section = 0
      print ""
      print
      next
    }
    in_section { next }
    { print }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

ensure_line_in_section() {
  local file="$1"
  local section="$2"
  local line="$3"
  local header="## ${section}"
  local tmp

  if grep -Fxq -- "$line" "$file"; then
    return
  fi

  tmp="$(mktemp)"
  awk -v header="$header" -v line="$line" '
    $0 == header {
      print
      in_section = 1
      inserted = 0
      next
    }
    in_section && /^## / {
      if (!inserted) {
        print ""
        print line
        inserted = 1
      }
      in_section = 0
      print
      next
    }
    { print }
    END {
      if (in_section && !inserted) {
        print ""
        print line
      }
    }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

normalize_spacing() {
  local file="$1"
  local tmp
  tmp="$(mktemp)"

  awk '
    /^## / {
      if (NR > 1 && !previous_blank) {
        print ""
      }
      print
      previous_blank = 0
      previous_list_item = 0
      pending_blank_after_list = 0
      next
    }
    /^$/ {
      if (previous_list_item) {
        pending_blank_after_list = 1
        next
      }
      if (!previous_blank) {
        print
      }
      previous_blank = 1
      previous_list_item = 0
      next
    }
    {
      if (pending_blank_after_list && $0 !~ /^- /) {
        print ""
      }
      print
      previous_blank = 0
      previous_list_item = ($0 ~ /^- /)
      pending_blank_after_list = 0
    }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

mkdir -p "$(dirname "$CONTEXT_PATH")"

if [[ "$RESET" == true || ! -e "$CONTEXT_PATH" ]]; then
  render_context > "$CONTEXT_PATH"
  printf 'Context index written: %s\n' "$CONTEXT_PATH"
  exit 0
fi

remove_placeholder_lines "$CONTEXT_PATH"

if [[ -n "$STATUS" ]]; then
  replace_prefixed_line "**Current Status:**" "$STATUS" "$CONTEXT_PATH"
fi

if [[ -n "$WORK_ORDER_TITLE" || -n "$WORK_ORDER_ID" ]]; then
  replace_work_order_section "$CONTEXT_PATH" "$(work_order_line)"
fi

if [[ -n "$BRANCH" ]]; then
  replace_prefixed_line "- Branch:" "$BRANCH" "$CONTEXT_PATH"
fi

if [[ -n "$PULL_REQUEST_URL" ]]; then
  replace_prefixed_line "- Pull Request URL:" "$PULL_REQUEST_URL" "$CONTEXT_PATH"
fi

for requirement in "${REQUIREMENTS[@]}"; do
  ensure_line_in_section "$CONTEXT_PATH" "Requirements" "$(format_entity_line "$requirement")"
done

for blueprint in "${BLUEPRINTS[@]}"; do
  ensure_line_in_section "$CONTEXT_PATH" "Blueprints" "$(format_entity_line "$blueprint")"
done

for referenced_blueprint in "${REFERENCED_BLUEPRINTS[@]}"; do
  ensure_line_in_section "$CONTEXT_PATH" "Referenced Blueprints" "$(format_entity_line "$referenced_blueprint")"
done

normalize_spacing "$CONTEXT_PATH"

printf 'Context index updated: %s\n' "$CONTEXT_PATH"
