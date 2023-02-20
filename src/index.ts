import fetch from "node-fetch"
import AdmZip from "adm-zip";

const iconv = require('iconv-lite');

const getData = async () => {
    const accountList: IAccount[] = []
    const getZip = await fetchZip()
    const documents = unZipDocuments(getZip)
    for (const document of documents) {
        const text = readDocument(document)
        parser(text, (i) => accountList.push(i))
    }
    return accountList
}

export const fetchZip = async (url = "http://www.cbr.ru/s/newbik") => {
    const request = await fetch(url)
    return  await request.buffer()

}

export interface IAccount {bic: string, name: string, corrAccount: string}

export const unZipDocuments = (buffer: Buffer) => {
    const zip = new AdmZip(buffer)
    const zipEntries = zip.getEntries()
    const documents: Buffer[] = []
    for (const zipEntry of zipEntries) {
         if (/.*\.xml/g.test(zipEntry.entryName)) {
             documents.push(zipEntry.getData())

        }
    }
    return documents
}

export const parser = (text: string, getAccount: (account: IAccount) => void) => {
    for (const [BICDirectoryEntryText] of text.matchAll(/<BICDirectoryEntry BIC="\d*">[\s\S]*?<\/BICDirectoryEntry>/g)) {
        const matchBICDirectoryEntry = BICDirectoryEntryText.match(/<BICDirectoryEntry BIC="\d*">/g)
        if (matchBICDirectoryEntry === null) continue
        const attributeTagBICDirectoryEntry = parserXMLTag(matchBICDirectoryEntry[0])
        const bic = attributeTagBICDirectoryEntry.get("BIC")
        if (bic === undefined) continue
        const matchParticipantInfo = BICDirectoryEntryText.match(/<ParticipantInfo [\s\S]*?><\/ParticipantInfo>/g)
        if (matchParticipantInfo === null) continue
        const attributeTagParticipantInfo = parserXMLTag(matchParticipantInfo[0])
        const name = attributeTagParticipantInfo.get("NameP")
        if (name === undefined) continue
        const matchAccounts = [...BICDirectoryEntryText.matchAll(/<Accounts [\s\S]*?><\/Accounts>/g)]
        for (const [accountText] of matchAccounts) {
           const attributeTagAccount = parserXMLTag(accountText)
            const corrAccount = attributeTagAccount.get("Account")
            if (corrAccount === undefined) continue
            getAccount({
                bic,
                name,
                corrAccount,
            })
        }
    }
}

export const readDocument = (document: Buffer) => {
    const documentAttribute = parserXMLTag(document.toString("utf8"))
    const encoding = documentAttribute.get("encoding") ?? "win1251"
    return iconv.decode(document, encoding) as string
}

export const parserXMLTag = (tag: string): Map<string, string> => {
    const matchName = tag.match(/<[_|\?|\w][\d\w]*/g)
    if (matchName === null) throw new Error("Название тэга не найденно")
    const name = matchName[0].replace("<", "")
    const matchAttribute = tag.match(new RegExp(`<${name} [\\s\\S]*?>`, "g"))
    const attributes: Map<string, string> = new Map()
    if (matchAttribute !== null) {
        const attributeText = matchAttribute[0].replace(new RegExp(`<${name}|>`, "g"), "").trim()
        const attributeNames = [...attributeText.matchAll(/[\w]*=/g)]
        for (let i = 0; i < attributeNames.length; i++) {
            const nameAttribute = attributeNames[i][0].replace("=", "")
            const attributeValueStart = (attributeNames[i].index ?? 0) + attributeNames[i][0].length
            const attributeValueEnd = i < attributeNames.length - 1 ? (attributeNames[i + 1].index ?? 0) - 1 : attributeText.length
            const attribute = attributeText.slice(attributeValueStart + 1, attributeValueEnd - 1)
            attributes.set(nameAttribute, attribute)
        }
    }
    return attributes
}


export default getData
