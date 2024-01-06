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

const NO_CREDS = {
    
}

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const email = process.env.EMAIL;
        const psd = process.env.PASSWORD;

        // IF !tanda_access_token exists 1 
        // 1. Auth to Tanda
        // IF !gcalendar_access_token exists 2
        // 2. Auth to Google

        // GET shifts from today -> next SUN
        // Loop through results -> create events accordingly
        // POST with await for each requests
        // POST with batch if possible.


        if (!email || !psd)
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Failed to schedule up your next shifts.',
                }),
            };


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
