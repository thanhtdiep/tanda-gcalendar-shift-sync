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

const NO_CREDS = {};

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const email = process.env.EMAIL;
        const psd = process.env.PASSWORD;
        const authenticateUrl = `${process.env.TANDA_BASE_URL}/oauth/token`;

        if (!email || !psd) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Missing Tanda credentials.',
                }),
            };
        }

        // 1. Auth to Tanda
        const tandaAccessToken = await axios({
            method: 'post',
            url: authenticateUrl,
            headers: {
                'Cache-Control': 'no-cache',
            },
            data: {
                username: email,
                password: psd,
                scope: 'me',
                grant_type: 'password',
            },
        });

        // GET shifts from today -> next SUN

        console.log(tandaAccessToken.statusText); // OK, error

        // Loop through results -> create events accordingly
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
                message: 'Failed to schedule up your next shifts.' + err,
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
