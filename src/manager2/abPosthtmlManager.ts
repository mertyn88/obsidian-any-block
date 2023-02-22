import type {
  MarkdownPostProcessorContext,
  MarkdownSectionInformation
} from "obsidian"

import {ABReg} from "src/config/abReg"
import {ConfDecoration, ConfSelect} from "src/config/abSettingTab"
import type AnyBlockPlugin from "../main"
import {RelpaceRender} from "./replaceRenderChild"

/** Html处理器
 * 被调用的可能：
 *   1. 全局html会分为多个块，会被每个块调用一次
 *      多换行会切分块、块类型不同也会切分（哪怕之间没有空行）
 *   2. 局部渲染时，也会被每个渲染项调用一次 (MarkdownRenderer.renderMarkdown方法，感觉tableextend插件也是这个原因)
 *   3. 用根节点createEl时也会被调用一次（.replaceEl）
  *  4. 状态会缓存，如果切换回编辑模式没更改再切回来，不会再次被调用
 * 
 * 总逻辑
 * - 后处理器，附带还原成md的功能
 *   - ~~html选择器~~
 *   - 渲染器
 * 
 */
export class ABPosthtmlManager{
  static processor(
    this: AnyBlockPlugin,
    el: HTMLElement, 
    ctx: MarkdownPostProcessorContext
  ) {
    // 设置里不启用，直接关了
    if (this.settings.decoration_render==ConfDecoration.none) return

    console.log("关卡1 1")
    // 获取el对应的源md
    const mdSrc = getSourceMarkdown(el, ctx)
    // console.log("el ctx", el, ctx, mdSrc)
    if (!mdSrc) return
    console.log("关卡1 2")

    // 局部选择器
    for (const subEl of el.children) {                          // 这个如果是块的话一般就一层，多层应该是p-br的情况
      findBlock(subEl as HTMLElement)
    }

    /** 找到div里的每一个选择块 */
    function findBlock(targetEl: HTMLElement){
      if (targetEl instanceof HTMLUListElement
        || targetEl instanceof HTMLQuoteElement
        || targetEl instanceof HTMLPreElement
      ) {
        // 判断是否有header并替换元素
        if(replaceElement(targetEl, ctx, "list")) return
        else if(!(targetEl instanceof HTMLPreElement)) {
          targetEl.children
          targetEl.firstElementChild
          for (let targetEl2 of targetEl.children){
            findBlock(targetEl2 as HTMLElement)
          }
        }
      }
    }

    // 结束，开启全局选择器
    if (mdSrc.to_line==mdSrc.content.split("\n").length){
      console.log("开始全局选择")
      global_selector(el, ctx)
      return
    }
    else if (el.classList.contains("mod-footer")){
      console.log("开始全局选择")
      global_selector(el, ctx)
      return
    }
  }
}

/** 尝试转化el
 * 判断是否有header并替换元素
 */
function replaceElement(targetEl: HTMLElement, ctx: MarkdownPostProcessorContext, selector: string){
  console.log("关卡2 1 判断是否有header", selector)
  const mdSrc = getSourceMarkdown(targetEl, ctx)
  if (!mdSrc || !mdSrc.header) return false
  console.log("关卡2 2 判断是否有header：：：：有")
  if (selector=="list"){
    if (mdSrc.header.indexOf("2")==0) mdSrc.header="list"+mdSrc.header
  }

  mdSrc.header=mdSrc.header??"md"   // 渲染模式的列表选择器若无header则给md
  ctx.addChild(new RelpaceRender(targetEl, mdSrc.header, mdSrc.content));
}

interface HTMLSelectorRangeSpec {
  from_line: number,// 替换范围
  to_line: number,  // .
  header: string,   // 头部信息
  selector: string, // 选择器（范围选择方式）
  content: string,  // 内容信息（已去除尾部空格）
  prefix: string,
}
/** 将html还原回md格式
 * 被processTextSection调用
 */
function getSourceMarkdown(
  sectionEl: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): HTMLSelectorRangeSpec|null {
  let info = ctx.getSectionInfo(sectionEl);     // info: MarkdownSectionInformation | null
  if (info) {
    // 基本信息
    console.log("info", info)
    const { text, lineStart, lineEnd } = info;  // 分别是：全文文档、div的开始行、div的结束行（结束行是包含的，+1才是不包含）
    const list_text = text.replace(/(\s*$)/g,"").split("\n")
    const list_content = list_text.slice(lineStart, lineEnd + 1)   // @attension 去除尾部空格否则无法判断 is_end，头部不能去除否则会错位
    const content = list_content.join("\n");

    // 找类型、找前缀
    console.log("关卡 3-1")
    let selector:string = "none"
    let prefix:string = ""
    if (sectionEl instanceof HTMLUListElement) {console.log("列表啊为", list_content)
      selector = "list"
      const match = list_content[0].match(ABReg.reg_list)
      if (!match) return null
      else prefix = match[1]
    }
    else if (sectionEl instanceof HTMLQuoteElement) {
      selector = "quote"
      const match = list_content[0].match(ABReg.reg_quote)
      if (!match) return null
      else prefix = match[1]
    }
    else if (sectionEl instanceof HTMLPreElement) {
      selector = "code"
      const match = list_content[0].match(ABReg.reg_code)
      if (!match) return null
      else prefix = match[1]
    }
    else if (sectionEl instanceof HTMLHeadingElement) {
      selector = "heading"
      const match = list_content[0].match(ABReg.reg_heading)
      if (!match) return null
      else prefix = match[1]
    }
    console.log("关卡 3-2")

    // 找头部header
    /** @todo 需要重写，一方面头部有可能在上上行，二方面要判断有前缀的情况*/
    if (lineStart==0) return null
    console.log("内容", list_text, list_text[lineStart-1])
    if (list_text[lineStart-1].indexOf(prefix)!=0) return null
    const match_header = list_text[lineStart-1].replace(prefix, "").match(ABReg.reg_header)
    if (!match_header) return null
    const header = match_header[4]
    console.log("关卡 3-3")

    // 返回
    const result:HTMLSelectorRangeSpec = {
      from_line: lineStart,
      to_line: lineEnd+1,
      header: header,
      selector: selector,
      content: content,
      prefix: prefix
    }
    return result
  }
  // console.warn("获取MarkdownSectionInformation失败，可能会产生bug") // 其实会return void，应该不会有bug
  return null
};


/** 全局选择器，在同一个文档里只渲染一次
 * 失败经验1：
 *      if (pEl.getAttribute("ab-title-flag")=="true")
 *      pEl.setAttribute("ab-title-flag", "true") // f这个好像会被清除掉
 * 失败经验2：
 *      后来发现是到了heading with header以后，此时的pEl.children后面的元素还没渲染出来，自然无法判断什么时候结束
 * 失败经验3：
 *      最后想到用mod-footer作为结束标志，再来启用全局选择器
 *      但好像不一定会有mod-footer和mod-header走这里，有时走有时不走，很烦。还有缓存机制也很烦
 *      话说我之前弄display:none怎么好像没bug，不过那个是高性能消耗运行多次，而非全局运行一次的……可能bug会少些
 * 失败经验4：
 *      用getSourceMarkdown的end来判断是否可行，好像还可以，比用mod-footer作为标志稳定
 *      但后来又发现这样的话末尾有空格时会有bug，要去除尾部空格（头部不要去除，会错位）
 *      然后还有一个坑：好像有的能选pertent有的不行，用document直接筛会更稳定
 * 后来基于经验4改了下终于成功了
 * 
 * 备注
 * page/pEl是整个文档
 * div/cEl是文档的根div，类型总为div
 * content/sub/(cEl.children)是有可能为p table这些元素的东西
 */
function global_selector(
  el: HTMLElement, 
  ctx: MarkdownPostProcessorContext
){
  // const pEl = el.parentElement    // 这里无法获取parentElement
  const pageEl = document.querySelectorAll(".workspace-leaf.mod-active .markdown-preview-section")[0]
  if (!pageEl) return
  let prev_header = ""                // 头部信息
  let prev_el:HTMLElement|null = null // 选中第一个标题，作用是用来替换为repalce块
  let prev_from_line:number = 0       // 开始行
  let prev_heading_level:number = 0   // 上一个标题的等级
  for (let i=0; i<pageEl.children.length; i++){
    const divEl = pageEl.children[i] as HTMLElement
    if (divEl.classList.contains("mod-header") 
      || divEl.classList.contains("markdown-preview-pusher")) continue
    if (divEl.classList.contains("mod-footer")) break
    // 寻找已经处理过的局部选择器，并……
    (()=>{
      if (!divEl.children[0]) return
      const subEl:any = divEl.children[0]
      if (!(subEl instanceof HTMLElement) || !subEl.classList.contains("ab-replace")) return
      // 隐藏局部选择器的header块
      const divEl_last = pageEl.children[i-1] as HTMLElement
      if (divEl_last.children.length != 1) return
      const subEl_last = divEl_last.children[0]
      if (subEl_last
        && subEl_last instanceof HTMLParagraphElement
        && ABReg.reg_header.test(subEl_last.getText())
      ){
        divEl_last.setAttribute("style", "display: none")
      }
    })()
    if (prev_heading_level == 0) {      // 寻找开始标志
      if (!divEl.children[0] || !(divEl.children[0] instanceof HTMLHeadingElement)) continue
      const mdSrc = getSourceMarkdown(divEl, ctx)
      if (!mdSrc) continue
      if (mdSrc.header=="") continue
      const match = mdSrc.content.match(ABReg.reg_heading)
      if (!match) continue
      prev_heading_level = match[1].length
      prev_header = mdSrc.header
      prev_from_line = mdSrc.from_line
      prev_el = divEl.children[0] // 就是标题那级
      // 隐藏全局选择器的header块
      const divEl_last = pageEl.children[i-1] as HTMLElement
        if (divEl_last.children.length == 1){
        const contentEl_last = divEl_last.children[0]
        if (contentEl_last
          && contentEl_last instanceof HTMLParagraphElement
          && ABReg.reg_header.test(contentEl_last.getText())
        ){
          divEl_last.setAttribute("style", "display: none")
        }
      }
    }
    else {                            // 寻找结束标志
      if (!divEl.children[0]){  // .mod-footer会触发这一层
        divEl.setAttribute("style", "display: none")
        continue
      }
      if (!(divEl.children[0] instanceof HTMLHeadingElement)){
        divEl.setAttribute("style", "display: none")
        continue
      }
      const mdSrc = getSourceMarkdown(divEl, ctx)
      if (!mdSrc) {
        divEl.setAttribute("style", "display: none")
        continue
      }
      const match = mdSrc.content.match(ABReg.reg_heading)
      if (!match){
        divEl.setAttribute("style", "display: none")
        continue
      }
      if (match[1].length >= prev_heading_level){  // 【改】可选同级
        divEl.setAttribute("style", "display: none")
        continue
      }

      // 渲染
      const cEl_last = pageEl.children[i-1] as HTMLElement   // 回溯到上一个
      const mdSrc_last = getSourceMarkdown(cEl_last, ctx)
      if (!mdSrc_last) {
        console.warn("标题选择器结束时发生意外情况")
        return
      }
      
      const header = prev_header??"md"
      const content = mdSrc_last.content.split("\n")
        .slice(prev_from_line, mdSrc_last.to_line).join("\n");
      if(prev_el) ctx.addChild(new RelpaceRender(prev_el, header, content));

      prev_header = ""
      prev_from_line = 0
      prev_heading_level = 0
      prev_el = null
      i-- /** 回溯一步，@bug 下一个标题的header行会被上一个隐藏 */
    }
  }
  if (prev_heading_level > 0){ /** 循环尾调用（@attention 注意：有个.mod-footer，所以不能用最后一个!）*/
    const i = pageEl.children.length-1
    // 渲染
    const cEl_last = pageEl.children[i-1] as HTMLElement /** @bug 可能有bug，这里直接猜使用倒数第二个 */
    const mdSrc_last = getSourceMarkdown(cEl_last, ctx)
    if (!mdSrc_last) {
      console.warn("标题选择器结束时发生意外情况")
      return
    }
    const header = prev_header??"md"
    const content = mdSrc_last.content.trim().split("\n")
      .slice(prev_from_line, mdSrc_last.to_line).join("\n");
    if(prev_el) ctx.addChild(new RelpaceRender(prev_el, header, content));
  }
}
