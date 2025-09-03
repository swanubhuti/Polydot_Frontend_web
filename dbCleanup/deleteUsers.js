import pkg from 'pg';
import dotenv from 'dotenv';

const { Client } = pkg;

// Load environment variables from .env file
dotenv.config();

async function deleteRecords() {

    const client = new Client({
        user: process.env.E2E_DB_USER,
        host: process.env.E2E_DB_HOST,
        database: process.env.E2E_DB_NAME,
        password: process.env.E2E_DB_PASSWORD,
        port: parseInt(process.env.E2E_DB_PORT || '5432'),
    });

    const businessPrefix = process.env.E2E_BUSINESS_PREFIX;

    const deleteQueries = {
        "User": `
            DELETE FROM public."User"
            WHERE "BusinessID" IN (
                SELECT k."BusinessID"
                FROM public."Business" k
                WHERE 
                (
                    k."BusinessName" LIKE '${businessPrefix}%'
                )
            );
        `,
        "HerdOwner": `
            DELETE FROM public."HerdOwner"
            WHERE "BusinessID" IN (
                SELECT k."BusinessID"
                FROM public."Business" k
                WHERE 
                (
                    k."BusinessName" LIKE '${businessPrefix}%'
                )
            );
        `,
        "LicenseAssignment": `
            DELETE FROM public."LicenseAssignment"
            WHERE "BusinessID" IN (
                SELECT k."BusinessID"
                FROM public."Business" k
                WHERE
                (
                    k."BusinessName" LIKE '${businessPrefix}%'
                )
            );
        `,
        "License": `
            DELETE FROM public."License"
            WHERE "BusinessID" IN (
                SELECT k."BusinessID"
                FROM public."Business" k
                WHERE 
                (
                    k."BusinessName" LIKE '${businessPrefix}%'
                )
            );
        `,
        "AnimalAlert": `
            DELETE FROM public."AnimalAlert"
            WHERE "AlertUUID" IN (
                SELECT m."AlertUUID"
                FROM public."Business" k
                INNER JOIN public."Alert" l ON l."BusinessID" = k."BusinessID"
                INNER JOIN public."AnimalAlert" m ON m."AlertUUID" = l."AlertUUID"
                WHERE 
                (
                    k."BusinessName" LIKE '${businessPrefix}%'
                )
            );
        `,
        "Alert": `
            DELETE FROM public."Alert"
            WHERE "BusinessID" IN (
                SELECT k."BusinessID"
                FROM public."Business" k
                WHERE 
                (
                    k."BusinessName" LIKE '${businessPrefix}%'
                )
            );
        `,
        "Business": `
            DELETE 
            FROM public."Business" k
            WHERE (
                k."BusinessName" LIKE '${businessPrefix}%'
            );
        `,
    };

    try {
        await client.connect();
        for (const table in deleteQueries) {
            const res = await client.query(deleteQueries[table]);
            console.log(`Rows affected in '${table}' table: ${res.rowCount}`);
        }
    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

deleteRecords();