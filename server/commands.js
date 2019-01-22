const chalk = require("chalk")
const moment = require("moment")
const MarkdownIt = require('markdown-it')
const github = require("./lib/github")
const file = require("./lib/files")
const repo = require("./lib/repo")
const datastore = require("./lib/datastore")
const template = require("./lib/template")
const { githubconfig } = require('./config/account')

const md = new MarkdownIt()

module.exports = {
  login: async () => {
    const token = github.getStoredGithubToken()

    if (token) {
      console.log(chalk.green('Authentication already exists~'))
      // process.exit();
      return
    }

    await github.setGithubCredentials()
    await github.registerNewToken()

    console.log(chalk.green('Login succesfully!'));
  },
  checkbuild: async () => {
    const listdocs = await repo.listCommits(githubconfig.owner, githubconfig.repo, '/docs', moment().subtract(1, 'days').format())
    const listfiles = await repo.listCommits(githubconfig.owner, githubconfig.repo, '/files', moment().subtract(1, 'days').format())
    
    const listdocsha = listdocs.map(m => m.sha)
    const listfilessha = listfiles.map(m => m.sha)
    // console.log(listdocsha, listfilessha)
    if (listdocsha.length > 0) {
      const sha = listdocsha[0]
      const hasbuild = listfilessha.find(m => m == sha) 
      if (!hasbuild) {
        return {
          build: true,
          sha: sha
        }
      }
    }
    return {
      build: false
    }
  },
  getCommitDetail: async (sha) => {
    const reslut = await repo.getCommit(githubconfig.owner, githubconfig.repo, sha)
    return reslut
  },
  filebuild: (files) => {
    // 1. 读取目录
    const addrs =  file.readdirSync('./docs')
    addrs.unshift('index')
    console.log(1)
    // 2. 生成详情页静态文件
    files.map(m => {
      const info = m.filename.split('/')
      const column = info[1]
      const title = info[2].replace('.md', '')
      
      m.htmlfilename = `./files/${column}/${title}.html`
      
      file.removefile(m.htmlfilename)
      if (m.status == 'removed') {
        datastore.check(m, column)
      } else if (m.status == 'renamed') {
        let data = file.readFileSync(`./${m.filename}`)
        let content = md.render(data.toString())
        datastore.check(m, column, info[2], content.substring(0, 100))
      } else {
        let data = file.readFileSync(`./${m.filename}`)
        let content = md.render(data.toString())
        datastore.check(m, column, info[2], content.substring(0, 100))
        let html = template.layoutDetail(content, addrs, title)
        file.writeFileSync(m.htmlfilename, html)
      }
    })
    
    console.log(2)
    // 3.生成主题页静态文件
    const subjects =  file.readdirSync('./files')
    // console.log(subjects)
    const docsdata = JSON.parse(file.readFileSync(`./data/docs.json`).toString()) 
    subjects.map(m => {
      if (m == '.DS_Store') { return }
      console.log(2, m)
      // let list = file.readdirSync(`./files/${m}`)
      let html = template.layoutSubject(m, docsdata[m], addrs)
      file.writeFileSync(`./subject/${m}.html`, html)
    })
    
    console.log(3)
    // 4.生成首页静态文件
    // let html = template.layoutSubject([], addrs)
    // file.writeFileSync(`./index.html`, html)
  }
}