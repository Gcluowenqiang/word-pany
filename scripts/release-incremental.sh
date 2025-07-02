#!/bin/bash

# 增量更新发布脚本
# 自动化构建、生成清单和发布流程

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 输出函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装后再运行此脚本"
        exit 1
    fi
}

# 获取版本号
get_version() {
    if [ -f "package.json" ]; then
        VERSION=$(node -p "require('./package.json').version")
    else
        log_error "package.json 文件未找到"
        exit 1
    fi
}

# 检查Git状态
check_git_status() {
    log_info "检查Git状态..."
    
    if ! git diff-index --quiet HEAD --; then
        log_warning "存在未提交的更改"
        echo "以下文件有未提交的更改："
        git status --porcelain
        echo
        read -p "是否继续发布？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "发布已取消"
            exit 0
        fi
    fi
    
    log_success "Git状态检查完成"
}

# 检查环境
check_environment() {
    log_info "检查构建环境..."
    
    # 检查必要的命令
    check_command "node"
    check_command "npm"
    check_command "git"
    
    # 检查Tauri CLI
    if ! command -v tauri &> /dev/null; then
        log_warning "Tauri CLI 未安装，尝试使用npx"
        TAURI_CMD="npx tauri"
    else
        TAURI_CMD="tauri"
    fi
    
    # 检查Node.js版本
    NODE_VERSION=$(node --version)
    log_info "Node.js版本: $NODE_VERSION"
    
    # 检查npm版本
    NPM_VERSION=$(npm --version)
    log_info "npm版本: $NPM_VERSION"
    
    # 获取项目版本
    get_version
    log_info "项目版本: $VERSION"
    
    log_success "环境检查完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    if [ ! -d "node_modules" ]; then
        npm install
    else
        log_info "依赖已存在，跳过安装"
    fi
    
    log_success "依赖安装完成"
}

# 构建前端
build_frontend() {
    log_info "构建前端应用..."
    
    npm run build
    
    if [ $? -eq 0 ]; then
        log_success "前端构建完成"
    else
        log_error "前端构建失败"
        exit 1
    fi
}

# 构建Tauri应用
build_tauri() {
    log_info "构建Tauri应用..."
    
    $TAURI_CMD build
    
    if [ $? -eq 0 ]; then
        log_success "Tauri构建完成"
    else
        log_error "Tauri构建失败"
        exit 1
    fi
}

# 生成增量更新清单
generate_manifest() {
    log_info "生成增量更新清单..."
    
    node scripts/build-incremental.js
    
    if [ $? -eq 0 ]; then
        log_success "增量更新清单生成完成"
    else
        log_error "增量更新清单生成失败"
        exit 1
    fi
}

# 显示构建结果
show_build_results() {
    log_info "构建结果摘要:"
    
    BUILD_DIR="src-tauri/target/release/bundle"
    MANIFEST_DIR="release-manifests"
    
    if [ -d "$BUILD_DIR" ]; then
        echo "📦 构建产物:"
        find "$BUILD_DIR" -type f \( -name "*.exe" -o -name "*.msi" -o -name "*.dmg" -o -name "*.deb" -o -name "*.AppImage" \) -exec ls -lh {} \; | while read line; do
            echo "   $line"
        done
    fi
    
    if [ -d "$MANIFEST_DIR" ]; then
        echo "📋 发布清单:"
        ls -la "$MANIFEST_DIR"/*.json | while read line; do
            echo "   $line"
        done
    fi
}

# 创建Git标签
create_git_tag() {
    log_info "创建Git标签..."
    
    TAG_NAME="v$VERSION"
    
    if git tag -l | grep -q "^$TAG_NAME$"; then
        log_warning "标签 $TAG_NAME 已存在"
        read -p "是否删除并重新创建？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git tag -d "$TAG_NAME"
            git push origin ":refs/tags/$TAG_NAME" 2>/dev/null || true
        else
            log_info "跳过标签创建"
            return
        fi
    fi
    
    git tag -a "$TAG_NAME" -m "Release version $VERSION with incremental update support"
    
    log_success "Git标签 $TAG_NAME 已创建"
}

# 推送到远程仓库
push_to_remote() {
    log_info "推送到远程仓库..."
    
    # 推送代码
    git push origin main
    
    # 推送标签
    git push origin "v$VERSION"
    
    log_success "推送完成"
}

# 显示发布说明
show_release_notes() {
    echo
    log_success "🎉 增量更新发布流程完成！"
    echo
    echo "📝 下一步操作:"
    echo "1. 访问 GitHub Releases 页面创建新发布"
    echo "2. 上传以下文件到 Release:"
    
    BUILD_DIR="src-tauri/target/release/bundle"
    if [ -d "$BUILD_DIR" ]; then
        find "$BUILD_DIR" -type f \( -name "*.exe" -o -name "*.msi" -o -name "*.dmg" -o -name "*.deb" -o -name "*.AppImage" \) | while read file; do
            echo "   - $(basename "$file")"
        done
    fi
    
    MANIFEST_DIR="release-manifests"
    if [ -f "$MANIFEST_DIR/release-$VERSION.json" ]; then
        echo "   - release-$VERSION.json (增量更新清单)"
    fi
    
    echo
    echo "3. 确保所有文件的下载URL与清单中的URL一致"
    echo "4. 测试自动更新功能"
    echo
    echo "🔗 GitHub Releases: https://github.com/Gcluowenqiang/word-pany/releases"
}

# 清理函数
cleanup() {
    log_info "清理临时文件..."
    # 这里可以添加清理逻辑
}

# 主函数
main() {
    echo "🚀 WordPony 增量更新发布脚本"
    echo "=================================="
    echo
    
    # 设置错误处理
    trap cleanup EXIT
    
    # 检查环境
    check_environment
    echo
    
    # 检查Git状态
    check_git_status
    echo
    
    # 安装依赖
    install_dependencies
    echo
    
    # 构建前端
    build_frontend
    echo
    
    # 构建Tauri应用
    build_tauri
    echo
    
    # 生成增量更新清单
    generate_manifest
    echo
    
    # 显示构建结果
    show_build_results
    echo
    
    # 询问是否创建Git标签
    read -p "是否创建Git标签并推送到远程仓库？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_git_tag
        push_to_remote
    else
        log_info "跳过Git操作"
    fi
    
    # 显示发布说明
    show_release_notes
}

# 执行主函数
main "$@" 