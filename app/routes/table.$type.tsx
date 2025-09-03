import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from "@remix-run/node";
import type { GenericAPI, GraphQLReturn, GraphQLSingleReturn } from "~/lib/types";
import { callAPI, getUserAccessToken } from "~/session.server";
import moment from 'moment';

export async function loader({request, params}: LoaderFunctionArgs) {
  const searchParams = new URL(request.url).searchParams
  let paramObject: {[key: string]: string} = {}
  let paging = {from: 0, to: 10}
  let sorting = {col: '', dir: ''}
  let columnList: string[] = []
  let conditions: string[] = []
  let groupUuid = ""
  let filter: string[] = []
  const type = params.type!
  searchParams.forEach((sp, key) => {
    if (!sp && sp !== "0") {
      return
    }
    switch (key) {
      case "from":
      case "to":
        paging[key] = Number(sp)
        break
      case "sortcol":
        sorting.col = sp.replace(/([A-Z])/g, '_$1').toUpperCase()
        break
      case "sortdir":
        sorting.dir = sp.toUpperCase()
        break
      case "search":
        const [searchVal, searchType] = sp.split('|')
        if (searchVal && searchType) {
          if (!isNaN(Number(searchVal))) {
            conditions.push(`${searchType}: ${searchVal}`)
          } else if (searchType.toLowerCase().includes('date') || (searchType.includes('Due') && !searchType.includes('Days'))) {
            const g = /^(\d{2})[-|/](\d{2})[-|/](\d{4})$/.exec(searchVal);
            if (g) {
              const date = g[1]
              const month = g[2]
              const year = g[3]
              const dt = `${year}-${month}-${date}`
              filter.push(`${searchType}: {greaterThanOrEqualTo: "${dt}T00:00:00", lessThanOrEqualTo: "${dt}T23:59:59"}`)
            }
          } else if (searchType.toLowerCase().includes('uuid') && searchVal.length === 36) {
            filter.push(`${searchType}: {equalTo: "${searchVal}"}`)
          } else {
            filter.push(`${searchType}: {likeInsensitive: "%${searchVal}%"}`)
          }
        }
        break
      case "group":
        groupUuid = sp
        break
      case "columns":
        columnList = sp.split(',')
        break
      default:
        if (key.includes('date') && sp.includes('|')) {
          const dateSplit = sp.split('|')
          if (dateSplit[1] && dateSplit[0]) {
            filter.push(`${key}: {greaterThanOrEqualTo: "${dateSplit[0]}T00:00:00", lessThanOrEqualTo: "${dateSplit[1]}T23:59:59"}`)
          } else if (dateSplit[0]) {
            filter.push(`${key}: {greaterThanOrEqualTo: "${dateSplit[0]}T00:00:00"}`)
          } else if (dateSplit[1]) {
            filter.push(`${key}: {lessThanOrEqualTo: "${dateSplit[1]}T23:59:59"}`)
          }
        } else {
          paramObject[key] = sp
        }
        break
    }
  })
  // await wait(1000)
  let view = "groupAnimalViews"
  let customQuery = ""

  switch (type) {
    case "status":
      if (groupUuid) {
        if (groupUuid === 'deadsold') {
          filter.push(`status: {in: ["Dead","Sold"]}`)
        } else {
          const groupCall = await callAPI<GraphQLSingleReturn>(request, '/api/graphql', {
            query: `{
              group (groupUuid: "${groupUuid}") 
              {
                groupName
                graphQl
              }
            }`
          })
          if (groupCall.success && !('errors' in groupCall.response) && groupCall.response.data.group?.graphQl) {
            filter.push("and: [" + groupCall.response.data.group.graphQl + "]")
          }
        }
      }
      if (paramObject['deadstatus'] === 'true') {
        const ftIdx = filter.findIndex((ft) => ft.includes('status:'))
        if (ftIdx > -1) {
          const currFilter = JSON.parse(`{${filter[ftIdx].replace(/(\w+):/g, '"$1":')}}`)
          let editedStatus = false
          
          if (currFilter.status) {
            currFilter.status.in.push("Dead", "Sold")
            editedStatus = true
            
          } else if (currFilter.and || currFilter.or) {
            const connectorType = currFilter.and ? 'and' : 'or'
            const idx = currFilter[connectorType].findIndex((a) => !!a.status)
            if (idx > -1) {
              currFilter[connectorType][idx].status.in.push("Dead", "Sold")
              editedStatus = true
            }
          }
          if (editedStatus) {
            const temp = JSON.stringify(currFilter).replace(/"(\w+)":/g, '$1:')
            filter[ftIdx] = temp.slice(1, temp.length - 1)
          }
        }
      } else if (!groupUuid) {
        filter.push(`status: {in: ["Calf","Yearling","Heifer","In Milk","Dry"]}`)
      }
      delete paramObject['deadstatus']
      if (paramObject['allherds'] === 'true') {
        delete paramObject['herdCode']
      }
      delete paramObject['allherds']
      columnList = ['animalUuid', ...columnList]
      if (!columnList.includes('whMilk')) {
        columnList.push('whMilk')
      }
      if (!columnList.includes('whMeat')) {
        columnList.push('whMeat')
      }
      break
    case "events":
      view = "animalEventViews"
      break
    case "lactation":
      view = "animalLactationViews"
      break;
    case "production":
      let dateFilter = '';
      dateFilter += paramObject.start ? `greaterThanOrEqualTo : "${paramObject.start}" ` : ''
      dateFilter += paramObject.end ? `lessThanOrEqualTo : "${paramObject.end}" ` : ''
      if (dateFilter) {
        filter.push(`testDate : {${dateFilter} }`)
      }
      delete paramObject.start
      delete paramObject.end
      view = "animalTestdayViews"
      break;
    case "calendar":
      view = 'animalCalendarViews'
      let calendarDateFilter = '';
      calendarDateFilter += paramObject.start ? `greaterThanOrEqualTo : "${paramObject.start}" ` : ''
      calendarDateFilter += paramObject.end ? `lessThanOrEqualTo : "${paramObject.end}T23:59:59" ` : ''

      if (calendarDateFilter) {
        switch (paramObject.display) {
          case "Calving":
            filter.push(` expectedCalvingDate: {${calendarDateFilter}}`)
            break
          case "Dry Off":
            filter.push(`dueDryDate: {${calendarDateFilter}}`)
            break
          case "Lead Feeding":
            filter.push(`leadFeedDate: {${calendarDateFilter}}`)
            break
        }
      }
      columnList = ['animalUuid', ...columnList]
      delete paramObject.start
      delete paramObject.end
      delete paramObject.display
      break;
    case "bulls":
    {
      view = 'bullTeamWithHerdViews';
      columnList = ['animalUuid', ...columnList];
      const { userData } = await getUserAccessToken(request);
      if (userData?.Role === 'user' && userData?.Herds) {
        filter.push(`herdUuid: {in: ${JSON.stringify(userData?.Herds)}}`);
      }
      break;
    }
    case "drugstocks":
      view = 'drugStocks'
      const {userData} = await getUserAccessToken(request)
      filter.push(`easyDairyId: {in: [${userData.EasyDairyID.map(eid => `"${eid}"`).join(',')}]}`)
      break
    case "withholding_meat":
    case "withholding_milk":
      view = 'animalWithholdingViews'
      columnList = ['animalUuid', ...columnList]
      filter.push(`${type === 'withholding_meat' ? 'meat' : 'milk'}Drug: {isNull: false}`)
      break
    case "herdTestAvg":
      view = "herdTestAvgViews"
      break
    case "abv":
      view = "abvChartViews"
      filter.push(`status: {in: ["Calf","Yearling","Heifer","In Milk","Dry"]}`)
      columnList = ['animalUuid', ...columnList]
      break
    case "liveweightsByAnimal":
    case "liveweightsByHerd":
    case "liveweightAverageDailyWeightGainByAnimal":
      view = "liveweightAllViews"
      break
    case "liveweightLatestWeightGainByHerd":
      view = "liveweightLatestViews"
      break
    case "liveweightLatestAverageDailyWeightGainByHerd":
      view = "liveweightLatestViews"
      break
    case "liveweightsHistoryByHerd":
      let q_startDate = moment(new Date(paramObject.startDate));
      let q_endDate = moment(new Date(paramObject.endDate));
      view = "liveweightHistoryHerdFunc"

      //eg. lowerlimitrangedate: "2002-10-01T00:00:00"
      //eg. upperlimitrangedate: "2011-10-01T00:00:00"
      customQuery = `
        {
          liveweightHistoryHerdFunc(
            offset: 0
            lowerlimitrangedate: "${q_startDate.format('YYYY-MM-DD')}T00:00:00"
            upperlimitrangedate: "${q_endDate.format('YYYY-MM-DD')}T00:00:00"
          ) {
            nodes {
              animalUuid
              animalName
              nationalId
              animalGender
              herdUuid
              herdCode
              herdName
              liveweightJsonData
            }
            totalCount
          }
        }        
      `
      break
    case "animalTransferRecords":
      filter.push(`event: { in: ["LT", "S", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] }`)
      view = "animalEventViews";
      break
    case "classifications":
      view = "classifications"
      break
    case "workabilityByAnimal":
      view = "workabilityAnimalViews"
      break;
    case "animalTransferPage":
      view = 'groupAnimalViews'
      let customFilter = ""
      if(paramObject.searchFilter && paramObject.searchFilterType){
        customFilter = `filter: {${paramObject.searchFilterType}: {likeInsensitive: "%${paramObject.searchFilter }%"} }` 
      }
      customQuery = `
        {
          groupAnimalViews(
            offset: 0
            condition: {
              herdCode: "${paramObject.herdCode}"
            }
            ${customFilter}
            ${sorting.col ? `orderBy: ${sorting.col}_${sorting.dir}` : ""}
          ) {
            nodes {
              animalUuid
              animalId
              name
              breed
              status
              dateOfBirth
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
            totalCount
          }
        }        
      `
      break;
    case 'animalPromotions':
      columnList = ['animalUuid', ...columnList]
      view = 'animalPromotions'
      customQuery = `
        {
          animalPromotions (
            offset: 0
            condition: {
              businessId: "${paramObject.businessId}"
            }
            ${sorting.col ? `orderBy: ${sorting.col}_${sorting.dir}` : ""}
          ) {
            nodes {
              id
              name
              breed
              breedDisplay
              price
              description
              status
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
            totalCount
          }
        }
      `
      break;
    case "bull_daughters": 
      columnList = ['animalUuid', ...columnList]
      break;
    case 'heat-CowManager':
    case 'heat-Halter':
    case 'heat-Datamars':
    case 'heat-HeatTime':
    case 'heat-Nedap':
    case 'heat-smaXtec':
      columnList = ['animalId', ...columnList]
      view = `heatDetect${type.replace('heat-','')}${type.endsWith('s') ? '' : 's'}`
      break;
    case 'drafted':
    case 'currentDraft':
    case 'nextDraft':
    case 'draftCows':
      columnList = ['animalId', ...columnList]
      view = 'drafts'
      if (type === 'drafted') {
        filter.push(`draftedDate: {isNull: false}`)
      } else {
        filter.push(`draftedDate: {isNull: true}`)
        if (type !== 'draftCows') {
          filter.push(`direction: {in: [0, 2]}`)
        }
      }
      break;
    case 'reproduction':
      columnList = ['animalUuid', ...columnList]
      break;
    case 'duplicates':
      view = 'duplicateAnimalViews'
      break;
    default:
      if (type.startsWith('event-')) {
        view = 'animalEventViews'
        columnList = ['animalUuid', 'eventUuid', ...columnList]
      }
  }
  
  // const filteredColumnList = columnList.filter(item => !item.includes("Perc"));
  var query = ""
  if(customQuery){
    query = customQuery
  } else {
    Object.entries(paramObject).forEach(([k, v]) => {
      if (k === 'damId' || k === 'animalId' || k === 'direction') {
        conditions.push(`${k}: ${v}`)
      } else {
        const split = v.split(',')
        if (split.length > 1) {
          filter.push(`${k}: {in: [${split.map(s => `"${s}"`).join(',')}]}`)
        } else {
          conditions.push(`${k}: "${v}"`)
        }
      }
    })
    query = `{
      ${view} (
        first: ${paging.to - paging.from}
        offset: ${paging.from > -1 ? paging.from : 0}
        condition: {
          ${conditions.join('\n')}
        }
        ${filter.length ? `filter: {${filter.join(' ')}}` : ""}
        ${sorting.col ? `orderBy: ${sorting.col}_${sorting.dir}` : ""}
      )
      {
        nodes {
          ${columnList.join('\n')}
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
        totalCount
      }
    }`
  }
  const {response, success} = await callAPI<GraphQLReturn>(request, '/api/graphql', {
    query
  })
  if (!success || 'errors' in response) {
    console.error(response)
    return json({
      rows: [],
      total: 0,
      hasNext: false
    })
  }
  switch (type) {
    case "liveweightsHistoryByHerd":
      //console.log("response.data[view].nodes, ",response.data[view].nodes)
      //console.log("startDate, ",paramObject.startDate)
      //console.log("endDate, ",paramObject.endDate)
      let v_startDate = moment(new Date(paramObject.startDate));
      let v_endDate = moment(new Date(paramObject.endDate));
      let v_monthDiff = v_endDate.diff(v_startDate,'months', true)
      //console.log("v_monthDiff, ",v_monthDiff)

      if (v_monthDiff < 1 ) {
        return json({rows: [], total: response.data[view].totalCount, hasNext: false})    
      }

      var tempCur = v_startDate.clone();
      var headingDataGenerated: Array<string> = []
      while (true) {
        let tempMonthDiff = v_endDate.diff(tempCur,'months', true)
        if (tempMonthDiff < 1){
          break
        }
        //console.log("tempCur, ", tempCur.format('YYYY-MM'))
        headingDataGenerated.push(tempCur.format('YYYY-MM'))
        tempCur.add(1, 'months');      
      }
      //console.log("headingDataGenerated, ",headingDataGenerated)

      let allData: any = response.data[view].nodes
      let tempRetData: any = []

      for( var x = 0 ; x < allData.length ;  x++ ){
        let jsonData: any = response.data[view].nodes[x]['liveweightJsonData'];
        let dataRow: any = { 
          animalUuid: response.data[view].nodes[x]['animalUuid'],
          animalName: response.data[view].nodes[x]['animalName'],
          nationalId: response.data[view].nodes[x]['nationalId'],
          animalGender: response.data[view].nodes[x]['animalGender'],
          herdUuid: response.data[view].nodes[x]['herdUuid'],
          herdCode: response.data[view].nodes[x]['herdCode'],
          herdName: response.data[view].nodes[x]['herdName'],
        }

        for(let x=0; x < headingDataGenerated.length; x++){
          for (let y=0; y < jsonData.length; y++){    
            if(jsonData[y]?.KeyMonthName == headingDataGenerated[x]){     
              dataRow[headingDataGenerated[x]] = jsonData[y]?.Weight
              break // break json loop to not overwrite old data
            } else {
              dataRow[headingDataGenerated[x]] = null
            }
          }
        }
        tempRetData.push( dataRow )
      }
      //console.log(tempRetData)
      return json({rows: tempRetData, total: response.data[view].totalCount, hasNext: false})      
  }

  return json({rows: response.data[view].nodes, total: response.data[view].totalCount, hasNext: response.data[view].pageInfo?.hasNextPage})
}

export async function action({request, params}: ActionFunctionArgs) {
  const type = params.type
  const formData = Object.fromEntries(await request.formData());
  if (type === "userPref") {
    const reportPrefs = JSON.parse(formData.reports as string)
    const resp = await callAPI<GenericAPI>(request, `/api/account`, {reports: reportPrefs}, "PATCH")
    if (!resp.success) {
      return json({success: false})
    }
    return json({success: resp.response?.message})
  }
  return json({success: false})
}