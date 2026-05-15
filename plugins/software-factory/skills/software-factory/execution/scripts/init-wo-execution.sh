#!/usr/bin/env bash
set -euo pipefail

print_usage() {
  echo "Usage:"
  echo "  bash path/to/software-factory/execution/scripts/init-wo-execution.sh \\"
  echo "    --work-order-number WO-XXX --work-order-title \"<title>\" --work-order-id <stable-id>"
  echo
  echo "Creates: .sw-factory/WO-XXX/"
  echo "  - checklist.md"
  echo "  - context.md"
  echo "  - implementation-plan.md"
  echo "  - review-log.md"
  echo
  echo "Safety:"
  echo "  Fails if target files already exist to prevent accidental overwrite."
}

escape_sed_replacement() {
  printf '%s' "$1" | sed -e 's/[\\/&]/\\&/g'
}

WORK_ORDER_NUMBER=""
WORK_ORDER_TITLE=""
WORK_ORDER_ID=""
OUTPUT_ROOT=".sw-factory"

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
    --output-root)
      OUTPUT_ROOT="${2:-}"
      shift 2
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      print_usage
      exit 1
      ;;
  esac
done

if [[ -z "$WORK_ORDER_NUMBER" || -z "$WORK_ORDER_TITLE" || -z "$WORK_ORDER_ID" ]]; then
  echo "Error: --work-order-number, --work-order-title, and --work-order-id are required." >&2
  print_usage
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TEMPLATES=(
  "$SCRIPT_DIR/checklist-template.md:checklist.md"
  "$SCRIPT_DIR/context-template.md:context.md"
  "$SCRIPT_DIR/implementation-plan-template.md:implementation-plan.md"
  "$SCRIPT_DIR/review-log-template.md:review-log.md"
)

for entry in "${TEMPLATES[@]}"; do
  template="${entry%%:*}"
  if [[ ! -f "$template" ]]; then
    echo "Error: template not found at $template" >&2
    exit 1
  fi
done

SAFE_WORK_ORDER_NUMBER="$(printf '%s' "$WORK_ORDER_NUMBER" | tr -c 'A-Za-z0-9._-' '-')"
OUTPUT_DIR="$OUTPUT_ROOT/$SAFE_WORK_ORDER_NUMBER"
mkdir -p "$OUTPUT_DIR"

INITIALIZED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

work_order_label() {
  local n="$WORK_ORDER_NUMBER"
  if [[ "$n" != WO-* ]]; then
    n="WO-$n"
  fi
  printf '%s' "$n"
}

NUMBER_ESCAPED="$(escape_sed_replacement "$WORK_ORDER_NUMBER")"
LABEL_ESCAPED="$(escape_sed_replacement "$(work_order_label)")"
TITLE_ESCAPED="$(escape_sed_replacement "$WORK_ORDER_TITLE")"
TIMESTAMP_ESCAPED="$(escape_sed_replacement "$INITIALIZED_AT")"
ID_ESCAPED="$(escape_sed_replacement "$WORK_ORDER_ID")"

apply_substitutions() {
  sed \
    -e "s/{{WORK_ORDER_NUMBER}}/${NUMBER_ESCAPED}/g" \
    -e "s/{{WORK_ORDER_LABEL}}/${LABEL_ESCAPED}/g" \
    -e "s/{{WORK_ORDER_TITLE}}/${TITLE_ESCAPED}/g" \
    -e "s/{{INITIALIZED_AT}}/${TIMESTAMP_ESCAPED}/g" \
    -e "s/{{WORK_ORDER_ID}}/${ID_ESCAPED}/g" \
    "$1" > "$2"
}

for entry in "${TEMPLATES[@]}"; do
  output_name="${entry##*:}"
  if [[ -e "$OUTPUT_DIR/$output_name" ]]; then
    echo "Error: $OUTPUT_DIR/$output_name already exists." >&2
    echo "Refusing to overwrite existing execution artifacts." >&2
    exit 1
  fi
done

echo "Work order directory initialized: $OUTPUT_DIR/"
for entry in "${TEMPLATES[@]}"; do
  template="${entry%%:*}"
  output_name="${entry##*:}"
  apply_substitutions "$template" "$OUTPUT_DIR/$output_name"
  echo "  - $output_name"
done
