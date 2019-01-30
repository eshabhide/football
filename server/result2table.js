const assert = require('assert')
const { readFileSync, writeFileSync } = require('fs')
const { join } = require('path')
const minimist = require('minimist')

const consoleError = msg => console.error('\x1b[31m%s\x1b[0m', msg)
const consoleGreen = msg => console.log('\x1b[32m%s\x1b[0m', msg)
const consoleInfo = msg => console.log('\x1b[36m%s\x1b[0m', msg)
const assertCheck = fnData => assert(fnData.errNo === 0, fnData.errMsg)

const inputData = checkInput();
assertCheck(inputData)

const fileContents = readFile(inputData)
assertCheck(fileContents)

const teamData = verifyTeams(fileContents.data, inputData)
assertCheck(teamData)

const tableToRow = tableToRowdata(fileContents.data)
assertCheck(tableToRow)

const readSummary = readSummaryFile(inputData)
assertCheck(readSummary)

const finalTable = verifyData(readSummary.data, teamData.data, tableToRow.data)
assertCheck(finalTable)

printTable(finalTable, inputData)

function printTable(printData, cli) {
  const lt = printData.summary.table
  const dt = printData.data

  const leagueTableLength = lt.length
  let errCount = 0

  for (let x = 0; x < leagueTableLength; ++x) {
    console.log(''.padStart('84','-'))
    let diffCheck = false
    let errLocal = 0
    const r = lt[x]
    const s = dt[x]
    const keyFields = Array.from('TGPWDLFAEP')

    const pe = (d,p) => d.toString().padEnd(p)
    const ps = (d,p) => d.toString().padStart(p)
    
    let rowString = `| ${pe(r.T,32)} | ${ps(r.G,3)} | ${ps(r.W,3)} | ${ps(r.D,3)} | ${ps(r.L,3)} |`
    rowString += ` ${ps(r.F,3)} | ${ps(r.A,3)} | ${ps(r.E,3)} | ${ps(r.P,3)} |`

    keyFields.forEach(e => { if (s[e] !== r[e]) { ++errLocal; diffCheck = true } })

    if (diffCheck === true) {
      let rowStringDiff = `| ${pe(s.T,32)} | ${ps(s.G,2)} | ${ps(s.W,3)} | ${ps(s.D,3)} | ${ps(s.L,3)} |`
      rowStringDiff += ` ${ps(s.F,3)} | ${ps(s.A,3)} | ${ps(s.E,3)} | ${ps(s.P,3)} |`
      consoleError(rowString)
      consoleError(rowStringDiff)
      consoleGreen(`ERRORS => ${errLocal}`)
    } else {
      consoleInfo(rowString)
    }

    errCount += errLocal
    
  }

  console.log(''.padStart('84','-'))

  if (errCount > 0) {
    consoleGreen(`TOTAL ERRORS => ${errCount}`)
    console.log(''.padStart('84','-'))
  } else {
    let fileString = `[\n`

    const tableLength = tableToRow.data.length

    for (let y = 0; y < tableLength; ++y) {
      fileString += `  ` + JSON.stringify(tableToRow.data[y]) + ',\n'
    }

    fileString = fileString.slice(0, -2) + '\n'
    fileString += `]`

    writeFileSync(join(cli.team, cli.season, 'matches.json'), fileString)
  }
}

function checkInput() {
  const cliArgs = minimist(process.argv.slice(2));
  cliArgs.errMsg = ''
  cliArgs.errNo = 0
  
  if (!(cliArgs.hasOwnProperty('file'))) {
    consoleError(`ERROR => Please enter argument --file to process`)
    consoleError(`USAGE => file should be placed in the temp folder`)
    cliArgs.errMsg = `ERROR => Argument --file not supplied`
    cliArgs.errNo = -1
  } else if(!(cliArgs.hasOwnProperty('team'))) {
    consoleError(`ERROR => Please enter argument --team to process`)
    consoleError(`USAGE => team name list is in README`)
    cliArgs.errMsg = `ERROR => Argument --team not supplied`
    cliArgs.errNo = -2
  } else if(!(cliArgs.hasOwnProperty('season'))) {
    consoleError(`ERROR => Please enter argument --season to process`)
    consoleError(`USAGE => season list is in README`)
    cliArgs.errMsg = `ERROR => Argument --season not supplied`
    cliArgs.errNo = -3
  }

  return cliArgs
}

function readFile(inputData) {
  let fileData
  let outputData = {}
  outputData.errMsg = ''
  outputData.errNo = 0

  try {
    fileData = readFileSync(join('temp', inputData.file), 'utf-8')
  } catch (err) {
    consoleError(`ERROR => Unable to read file the ${inputData.file}`)
    consoleError(`USAGE => file should be placed in the temp folder`)
    outputData.errMsg = `ERROR => Unable to read the file ${inputData.file}`
    outputData.errNo = -1
  } finally {
    if (fileData) {
      outputData.data = fileData.split(/\r\n|\r|\n/).filter((r) => r.length > 0)
      const fileLines = outputData.data.length
      
      // Read the first line
      const teamList = outputData.data[0].split('\t')

      if (teamList.length !== fileLines) {
        console.error(`ERROR => Error in file structure, please verify`)
        outputData.errMsg = `ERROR in file structure of CSV file`
        outputData.errNo = -2
      }
    }

    return outputData
  }
}

function tableToRowdata(fileContents) {
  const eplTable = []
  let outputData = {}
  outputData.errMsg = ''
  outputData.errNo = 0

  // Read the first line
  const teamList = fileContents[0].split('\t')
  const fileContentsLength = fileContents.length

  for(let x = 1; x < fileContentsLength; ++x) {
    const homeGameList = fileContents[x].split('\t')
    const homeGameLength = homeGameList.length
    let z = 1

    for (let y = 1; y < homeGameLength; ++y) {

      if (x !== y) {
        const homeGame = {}
        const score = homeGameList[y].split('–')

        homeGame.H = teamList[x]
        homeGame.A = teamList[y]
        homeGame.S = score[0]
        homeGame.C = score[1]
        homeGame.I = ((x - 1) * 21) + z++
    
        eplTable.push(homeGame)
      }
    }
  }

  outputData.data = eplTable
  return outputData
}

function readSummaryFile(cli) {
  let fileData
  let outputData = {}
  outputData.errMsg = ''
  outputData.errNo = 0

  try {
    fileData = readFileSync(join(cli.team, cli.season, 'summary.json'), 'utf-8')
  } catch (err) {
    consoleError(`ERROR => Unable to read file the ${cli.team} ${cli.season}`)
    consoleError(`USAGE => file should be placed in the season folder`)
    outputData.errMsg = `ERROR => Unable to read the file ${cli.team} ${cli.season}`
    outputData.errNo = -1
  } finally {
    if (fileData) {
      outputData.data = JSON.parse(fileData)

      if (outputData.data.name === 'noname') {
        consoleError(`ERROR => The summary file for the season is incomplete`)
        consoleError(`USAGE => This is usually caused by wrong season name`)
        outputData.errMsg = `ERROR => The summary file for the season is incomplete`
        outputData.errNo = -1
      }
    }
  }

  return outputData
}

function verifyData(summaryTable, teamTable, fullData) {
  let outputData = {}
  outputData.errMsg = ''
  outputData.errNo = 0

  const keyFields = Array.from('GWDLFAEP')
  const fullDataLength = fullData.length
  const seasonData = {}
  
  for (let x = 0; x < fullDataLength; ++x) {
    let at = fullData[x].A
    let ht = fullData[x].H
    if (!(seasonData.hasOwnProperty(ht))) {
      seasonData[ht] = {}
      seasonData[ht].T = teamTable[ht]
      keyFields.forEach((e) => {seasonData[ht][e] = 0})
    }

    if (!(seasonData.hasOwnProperty(at))) {
      seasonData[at] = {}
      seasonData[at].T = teamTable[at]
      keyFields.forEach((e) => {seasonData[at][e] = 0})
    }

    seasonData[ht].F += parseInt(fullData[x].S, 10)
    seasonData[ht].A += parseInt(fullData[x].C, 10)
    seasonData[ht].G += 1
    seasonData[ht].I = fullData[x].id

    seasonData[at].F += parseInt(fullData[x].C, 10)
    seasonData[at].A += parseInt(fullData[x].S, 10)
    seasonData[at].G += 1
    seasonData[at].I = fullData[x].id

    
    
    if ((parseInt(fullData[x].S) === parseInt(fullData[x].C))) {
      seasonData[ht].P += 1
      seasonData[ht].D += 1
      seasonData[at].P += 1
      seasonData[at].D += 1
    } else if ((parseInt(fullData[x].S) > parseInt(fullData[x].C))) {
      seasonData[ht].P += 2
      seasonData[ht].W += 1
      seasonData[at].L += 1
    } else {
      seasonData[at].P += 2
      seasonData[at].W += 1
      seasonData[ht].L += 1
    }

    seasonData[ht].E = seasonData[ht].F - seasonData[ht].A
    seasonData[at].E = seasonData[at].F - seasonData[at].A
  }

  let teamRecord = Object.values(seasonData)

  let sortedTeam = teamRecord.sort((a,b) => {
    let aS = (a.P * 10000 + a.E * 100 + a.G * 1)
    let bS = (b.P * 10000 + b.E * 100 + b.G * 1)

    if (aS < bS)
      return 1
    else if (aS > bS)
      return -1
    else
      return 0
  })

  outputData.data = sortedTeam
  outputData.summary = summaryTable

  return outputData
}

function verifyTeams(fileContents, inputData) {
  let fileData
  let outputData = {}
  outputData.errMsg = ''
  outputData.errNo = 0

  try {
    fileData = readFileSync(join(inputData.team, 'teams.json'), 'utf-8')
  } catch (err) {
    consoleError(`ERROR => Unable to read the team file for ${inputData.team}`)
    consoleError(`USAGE => Ensure that there is a teams.json file in the ${inputData.team} folder`)
    outputData.errMsg = `ERROR => Unable to read the team file for ${inputData.team}`
    outputData.errNo = -1
  } finally {
    if (fileData) {
      const teamJSON = JSON.parse(fileData)
      const teamList = fileContents[0].split('\t').filter((e, i) => i !== 0)
      const teamName = fileContents.map(r => r.split('\t')[0]).filter((e, i) => i !== 0)
      outputData.data = teamJSON
      
      // Validate that all teams exist and in the correct order
      const teamListCount = teamList.length
      for (let x = 0; x < teamListCount; ++x) {
        if (teamJSON.hasOwnProperty(teamList[x])) {
          if (teamJSON[teamList[x]] !== teamName[x]) {
            consoleError(`ERROR => The team name for code ${teamList[x]} is wrong`)
            consoleError(`USAGE => Expected to find the entry for ${teamName[x]} in teams.json`)
            consoleError(`FIX => { ${teamList[x]}: ${teamName[x]} }`)
            outputData.errMsg = `ERROR => Incorrect mapping for team name for code ${teamList[x]}`
            outputData.errNo = -2  
          }
        } else {
          consoleError(`ERROR => Unable to find the team name for code ${teamList[x]}`)
          consoleError(`USAGE => Expected to find the entry for ${teamName[x]} in teams.json`)
          consoleError(`FIX => { ${teamList[x]}: ${teamName[x]} }`)
          outputData.errMsg = `ERROR => Unable to find team name for code ${teamList[x]}`
          outputData.errNo = -3
        }
      }
    }

    return outputData
  }
}
