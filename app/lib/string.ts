import { z } from "zod"

export const regex = {
    special: /[-._!"`'#%&,:;<>=@{}~\$\(\)\*\+\/\\\?\[\]\^\|]+/
}

export const passwordPolicy = {
    minSize: 8,
    upperCaseAlpha: 1,
    lowerCaseAlpha: 1,
    numeric: 1,
    special: 1
}

export function countCharacters(s:string) {
    let characters = {
        upperCaseAlpha: 0,
        lowerCaseAlpha: 0,
        numeric: 0,
        special: 0
    }

    for(let i = 0; i < s.length; i++) {
        let char = s[i]
        if('a' <= char && char <= 'z') characters.lowerCaseAlpha++
        else if('A' <= char && char <= 'Z') characters.upperCaseAlpha++
        else if('0' <= char && char <= '9') characters.numeric++
        else if(regex.special.test(char)) characters.special++
    }

    return characters
}

export function validatePassword(val: string){
    let message = []
    if(val.length < passwordPolicy.minSize) {
        message.push(`Password must be at least ${passwordPolicy.minSize} characters`)
    }
    let charCount = countCharacters(val)
    if(charCount.lowerCaseAlpha < passwordPolicy.lowerCaseAlpha) {
        message.push(`Password must have at least ${passwordPolicy.lowerCaseAlpha} lower case alpha characters`)
    }

    if(charCount.upperCaseAlpha < passwordPolicy.upperCaseAlpha) {
        message.push(`Password must have at least ${passwordPolicy.upperCaseAlpha} upper case alpha characters`)

    }
    if(charCount.numeric < passwordPolicy.numeric) {
        message.push(`Password must have at least ${passwordPolicy.numeric} numeric characters`)
    }

    if(charCount.special < passwordPolicy.special) {
        message.push(`Password must have at least ${passwordPolicy.special} special characters`)
    }
    return {
        message,
        success: !message.length
    }
}

export const passValidation = (pass: string, ctx: z.RefinementCtx) => {
    let validate = validatePassword(pass)
    if(!validate.success) {
        validate.message.forEach(o => ctx.addIssue({
            message: o,
            code: z.ZodIssueCode.custom,
        })
        )
    }
}

export const optionalPassValidation = (pass: string | undefined, ctx: z.RefinementCtx) => {
    if(!pass) return
    let validate = validatePassword(pass)
    if(!validate.success) {
        validate.message.forEach(o => ctx.addIssue({
            message: o,
            code: z.ZodIssueCode.custom,
        })
        )
    }
}