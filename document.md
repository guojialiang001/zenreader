

1SSH工具   VIM进入之后切换insert模式发现编辑不了,输入字母没任何反应。
2进入VIM页面后，先进入Insert模式，再ESC退到命令模式，再按i进入insert模式，发现光标在最后一行，没有回到正常编辑区域。
3.在vim中，command模式，冒号都输入不了，底部没有冒号展示、
4.VIM里按ESC无效，回不到VIM命令模式，没有在底部写上模式状态，应该回到command模式
 5 {"type":"input","data":{"input":"\u001b","currentPath":"/","vimMode":"NORMAL"}}  进入VIM需要把VIM键盘输入和外部命令行隔离。不能用input 类型   所有相关VIM 命令统一type  vim_command
6vim需要有多种状态切换
这两个问题需要同时保证。VIN只在前端编辑即可，最后保存的时候发送给后端即可。
 书写前端D:\project\zenreader\pages\SshTerminal.vue
 只修改指定的问题
不触及其他问题
不扰乱其他运行逻辑
 完全兼容，所有回归测试通过
需要单元测试。给出单元测试报告  这个整体问题极大


Vim 的 6 种主要模式
1. 普通模式 (Normal Mode)
默认模式，用于导航和操作文本。

Esc 从其他模式返回

i 进入插入模式

v 进入可视模式

: 进入命令行模式

R 进入替换模式

2. 插入模式 (Insert Mode)
用于输入文本。

Esc 返回普通模式

Ctrl+[ 返回普通模式（同 Esc）

Ctrl+w 删除前一个单词

Ctrl+u 删除到行首

Ctrl+h 删除前一个字符（同退格）

Ctrl+t 增加缩进

Ctrl+d 减少缩进

3. 可视模式 (Visual Mode)
用于选择文本。

字符可视模式 v - 选择字符

行可视模式 V - 选择整行

块可视模式 Ctrl+v - 选择矩形区域

o 切换选择起点/终点

Esc 返回普通模式

4. 命令行模式 (Command-line Mode)
执行 Vim 命令。

: 进入命令行

/ 正向搜索

? 反向搜索

! 执行外部命令

q 退出

5. 替换模式 (Replace Mode)
直接替换字符。

R 进入替换模式

r 替换单个字符（不进入模式）

Esc 返回普通模式

6. 选择模式 (Select Mode)
类似 GUI 的选择。

gh 进入选择模式

比较少用，通常用可视模式

完整按键速查表
移动光标（普通模式）
基础移动
vim
h       左
j       下
k       上
l       右

w       下一个单词开头
W       下一个单词开头（忽略标点）
e       下一个单词末尾
E       下一个单词末尾（忽略标点）
b       上一个单词开头
B       上一个单词开头（忽略标点）
0       行首
^       行首非空白字符
$       行尾
gg      文件开头
G       文件末尾
:n      跳转到第 n 行
屏幕内移动
vim
H       屏幕顶部
M       屏幕中间
L       屏幕底部
Ctrl+f  向下翻页
Ctrl+b  向上翻页
Ctrl+d  向下半页
Ctrl+u  向上半页
zz      当前行居中
zt      当前行到顶部
zb      当前行到底部
搜索移动
vim
f{char} 向右查找字符
F{char} 向左查找字符
t{char} 向右到字符前
T{char} 向左到字符前
;       重复上一次 f/F/t/T
,       反向重复

/pattern 向前搜索
?pattern 向后搜索
n       下一个匹配
N       上一个匹配
*       搜索当前单词（向前）
#       搜索当前单词（向后）
编辑操作
插入文本
vim
i       在光标前插入
I       在行首插入
a       在光标后插入
A       在行尾插入
o       在下方新建行插入
O       在上方新建行插入
s       删除字符并插入
S       删除整行并插入
C       删除到行尾并插入
cc      删除整行并插入
删除操作
vim
x       删除当前字符
X       删除前一个字符
dw      删除到单词末尾
de      删除到单词末尾（包括空格）
d$      删除到行尾
dd      删除整行
D       删除到行尾（同 d$）
dt{char} 删除到指定字符前
daw     删除整个单词（含空格）
diw     删除单词内部
复制粘贴
vim
y       复制（yank）
yy      复制整行
yw      复制单词
y$      复制到行尾
p       在光标后粘贴
P       在光标前粘贴
"*p     从系统剪贴板粘贴
"*y     复制到系统剪贴板
撤销重做
vim
u       撤销
Ctrl+r  重做
U       恢复整行
.       重复上次操作
文本对象操作
基础对象
vim
iw      单词内部
aw      整个单词（含空格）
iW      字串内部
aW      整个字串
is      句子内部
as      整个句子
ip      段落内部
ap      整个段落
符号对象
vim
i"      "" 内部
a"      "" 整体
i'      '' 内部
a'      '' 整体
i(      () 内部
a(      () 整体
i[      [] 内部
a[      [] 整体
i{      {} 内部
a{      {} 整体
i<      <> 内部
a<      <> 整体
it      XML标签内部
at      XML标签整体
可视模式操作
选择
vim
v       进入字符可视模式
V       进入行可视模式
Ctrl+v  进入块可视模式
gv      重新选择上次选择区域
操作
vim
y       复制选择区域
d       删除选择区域
c       删除并插入
>       向右缩进
<       向左缩进
=       自动格式化
u       变小写
U       变大写
~       切换大小写
窗口管理
窗口操作
vim
:sp     水平分割
:vsp    垂直分割
Ctrl+w s 水平分割
Ctrl+w v 垂直分割
Ctrl+w w 切换窗口
Ctrl+w h 左窗口
Ctrl+w j 下窗口
Ctrl+w k 上窗口
Ctrl+w l 右窗口
Ctrl+w c 关闭窗口
Ctrl+w o 只保留当前窗口
Ctrl+w = 均衡窗口大小
Ctrl+w + 增加窗口高度
Ctrl+w - 减少窗口高度
Ctrl+w > 增加窗口宽度
Ctrl+w < 减少窗口宽度
标签页
vim
:tabnew 新建标签页
:tabc   关闭标签页
:tabn   下一个标签页
:tabp   上一个标签页
gt      下一个标签页
gT      上一个标签页
:tabs   显示所有标签页
寄存器操作
vim
"ay     复制到寄存器 a
"ap     粘贴寄存器 a 的内容
:reg    显示所有寄存器
"+     系统剪贴板寄存器
"*     选择寄存器（Linux）
"_     黑洞寄存器（删除不进寄存器）
宏录制
vim
qa      开始录制宏到寄存器 a
q       停止录制
@a      执行寄存器 a 的宏
@@      重复上次执行的宏
:reg a  查看宏内容
常用命令模式命令
文件操作
vim
:w      保存
:wq     保存并退出
:q      退出
:q!     强制退出不保存
:x      保存并退出（同 :wq）
:e filename 编辑文件
:bn      下一个缓冲区
:bp      上一个缓冲区
:bd      关闭缓冲区
:ls      列出所有缓冲区
搜索替换
vim
:%s/old/new/g     全局替换
:%s/old/new/gc    全局替换并确认
:10,20s/old/new/g 在10-20行替换
:s/old/new/g      当前行替换
:g/pattern/d      删除匹配行
:v/pattern/d      删除不匹配行
设置
vim
:set number       显示行号
:set nonumber     隐藏行号
:set relativenumber 相对行号
:set paste        粘贴模式
:set nopaste      关闭粘贴模式
:set wrap         自动换行
:set nowrap       不自动换行
:set hlsearch     高亮搜索
:set nohlsearch   不高亮搜索
:set incsearch    实时搜索
高效组合技
快速编辑
vim
ciw     删除单词并插入（change inner word）
caw     删除整个单词并插入
cit     删除标签内容并插入
ci"     删除引号内内容并插入
dt)     删除到右括号
快速移动
vim
Ctrl+o  跳转到上次位置
Ctrl+i  跳转到下次位置
%       跳转到匹配括号
*       搜索当前单词
gd      跳转到局部定义
gD      跳转到全局定义
实用技巧
vim
.       重复上次操作
q:      打开命令历史
q/      打开搜索历史
@:      重复上次命令
Ctrl+a  数字加1
Ctrl+x  数字减1
配置文件相关
vim
:source ~/.vimrc  重新加载配置
:scriptnames      查看加载的脚本
:version          查看Vim版本
:set all          查看所有设置
插件常用键位
如果你安装了常用插件：

vim
<leader>n       打开/关闭文件树（NERDTree）
<leader>f       文件搜索（FZF）
<leader>p       项目搜索（CtrlP）
<leader>g       显示Git状态（vim-fugitive）
<leader>c       注释/取消注释（nerdcommenter）
gs              显示Git差异（vim-gitgutter）
实用自定义映射示例
vim
" 在 .vimrc 中添加
nnoremap <leader>ev :vsplit $MYVIMRC<cr>    " 编辑vimrc
nnoremap <leader>sv :source $MYVIMRC<cr>    " 重载vimrc
nnoremap <leader>" viw<esc>a"<esc>bi"<esc>lel  " 给单词加引号
nnoremap <leader>' viw<esc>a'<esc>bi'<esc>lel  " 给单词加单引号
nnoremap <leader>y "+y      " 复制到系统剪贴板
nnoremap <leader>p "+p      " 从系统剪贴板粘贴
nnoremap <space> za         " 空格键折叠/展开
学习路径建议
第一阶段（基础）
移动：h,j,k,l, w,b, 0,$, gg,G

编辑：i,a,o, x,d,dd,u,Ctrl+r

保存退出：:w, :q, :wq, :q!

第二阶段（进阶）
文本对象：iw,aw, i",a"

搜索：/,n,N, *

可视模式：v,V, y,p

窗口：:sp, :vsp, Ctrl+w

第三阶段（高手）
宏：qa, @a

寄存器：",+,*

命令模式：:%s, :g, :v

插件管理

记住：Vim 的关键是组合，单个命令功能有限，但组合起来威力无穷！