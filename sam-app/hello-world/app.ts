import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';
/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

const TIMEFRAME = 6;

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const email = process.env.EMAIL;
        const psd = process.env.PASSWORD;
        const authUrl = `${process.env.TANDA_BASE_URL}/oauth/token`;

        if (!email || !psd) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Missing Tanda credentials.',
                }),
            };
        }

        // 1. Auth to Tanda
        const authRes = await axios({
            method: 'post',
            url: authUrl,
            headers: {
                'Cache-Control': 'no-cache',
            },
            data: {
                username: email,
                password: psd,
                scope: 'roster',
                grant_type: 'password',
            },
        });

        if (authRes.statusText == 'error') throw 'Auth failed.';

        // GET shifts from today -> next SUN
        const date = new Date();
        const year = date.getFullYear();
        const month = (1 + date.getMonth()).toString().padStart(2, '0');
        const fromDay = date.getDate().toString().padStart(2, '0');
        const toDay = (date.getDate() + TIMEFRAME).toString().padStart(2, '0');

        const fromDate = `${year}-${month}-${fromDay}`;
        const toDate = `${year}-${month}-${toDay}`;
        const shiftsUrl = `${process.env.TANDA_BASE_URL}/v2/schedules?from=${fromDate}&to=${toDate}`;
        const authHeader = `bearer ${authRes.data.access_token}`;

        console.log(authRes.data);
        console.log(authHeader);

        const shiftsRes = await axios({
            method: 'get',
            url: shiftsUrl,
            headers: {
                Authorization: authHeader,
            },
        });

        // Loop through results -> create events accordingly
        // shiftsRes.data
        // keys -> start, finish
        // default values ->
        //      title - Quest Hotel Housekeeping
        //      notification - 6pm night before, 2 hours before start
        //      tag color - red

        console.log(shiftsRes);
        // ------------------------------------- PART 2 -----------------------------------
        // TODO: CREATE CALENDAR EVENT WITH ABOVE ATTRIBUTES, CHECK IF THERES BATCH CREATE
        // POST with await for each requests
        // POST with batch if possible.

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'hello world ' + email + ' ' + psd,
            }),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to schedule up your next shifts.',
            }),
        };
    }

    // try {
    //     const url = 'https://api.example.com';
    //     const username = 'your-username';
    //     const password = 'your-password';

    //     const auth = {
    //         username: username,
    //         password: password,
    //     };

    //     try {
    //         const response = await axios.get(url, { auth: auth });
    //         console.log(response.data);
    //         return response.data;
    //     } catch (error) {
    //         console.error(error);
    //         throw error;
    //     }
    // } catch (err) {
    //     console.log(err);
    //     return {
    //         statusCode: 500,
    //         body: JSON.stringify({
    //             message: 'Failed to schedule up your next shifts.',
    //         }),
    //     };
    // }
};
