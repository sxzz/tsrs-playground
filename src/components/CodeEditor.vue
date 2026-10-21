<script lang="ts" setup>
import * as monaco from 'monaco-editor'
import {
  computed,
  onBeforeUnmount,
  onMounted,
  useTemplateRef,
  watch,
} from 'vue'
import { getSharedMonacoOptions } from '../composables/editor'

const modelValue = defineModel<string>({ default: '' })
const props = defineProps<{ model: monaco.editor.ITextModel }>()
const editorElement = useTemplateRef<HTMLDivElement>('editorElement')
let editor: monaco.editor.IStandaloneCodeEditor | undefined

const options = computed(() => ({
  ...getSharedMonacoOptions(),
  fontSize: 13,
  fontLigatures: true,
}))
watch(options, () => editor?.updateOptions(options.value))

watch(modelValue, (value) => {
  if (props.model.getValue() !== value) props.model.setValue(value)
})
watch(
  () => props.model,
  (model) => editor?.setModel(model),
)

onMounted(() => {
  editor = monaco.editor.create(editorElement.value!, {
    ...options.value,
    model: props.model,
  })
  editor.onDidChangeModelContent(() => {
    modelValue.value = editor!.getValue()
  })
})

onBeforeUnmount(() => editor?.dispose())
</script>

<template>
  <div ref="editorElement" />
</template>
