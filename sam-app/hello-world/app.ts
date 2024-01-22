import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';

// import serviceAccount from './tgsspk.json';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

interface TandaShift {
    id: number;
    roster_id: number;
    user_id: number;
    start: number;
    finish: number;
    breaks?: [
        {
            start: number;
            finish: number;
        },
    ];
    automatic_break_length?: number;
    department_id?: number;
    shift_detail_id?: number;
    cost?: number;
    last_published_at?: number;
    record_id?: number;
    needs_acceptance?: true;
    creation_method?: string;
    creation_platform?: string;
    [key: string]: any;
}

interface Event {
    summary: string;
    location: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    reminders: {
        useDefault: boolean;
        overrides: [{ method: string; minutes: number }, { method: string; minutes: number }];
    };
}

const TIMEFRAME = 6;
const TANDA_SCOPES = ['roster'];
const GAPI_SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'];
const calendar = google.calendar('v3');

const secondsToISOString = (seconds: number): string => {
    return new Date(seconds * 1000).toISOString();
};

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const authUrl = `${process.env.TANDA_BASE_URL}/oauth/token`;

        // null check
        if (!process.env.TANDA_EMAIL || !process.env.TANDA_PASSWORD || !process.env.CALENDAR_ID) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    message: 'Missing credentials.',
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
                username: process.env.TANDA_EMAIL,
                password: process.env.TANDA_PASSWORD,
                scope: TANDA_SCOPES.join(' '),
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

        const shiftsRes = await axios({
            method: 'get',
            url: shiftsUrl,
            headers: {
                Authorization: authHeader,
            },
        });
        const shifts: TandaShift[] = shiftsRes.data;

        // Loop through results -> create events accordingly
        let events: Event[] = [];
        await shifts.forEach((shift: TandaShift) => {
            const startTime = secondsToISOString(shift.start);
            const endTime = secondsToISOString(shift.finish);
            events.push({
                summary: 'WORK - Quest Hotel Eight Mile Plain',
                location: 'Quest Hotel Eight Mile Plain',
                start: {
                    dateTime: startTime,
                    timeZone: 'Australia/Brisbane',
                },
                end: {
                    dateTime: endTime,
                    timeZone: 'Australia/Brisbane',
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 12 * 60 },
                        { method: 'popup', minutes: 3 * 60 },
                    ],
                },
            });
        });

        // GCalendar API Auth
        if (!process.env.GAPI_SERVICE_PRIVATE_KEY || !process.env.GAPI_SERVICE_EMAIL) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    message: 'Missing Google services credentials.',
                }),
            };
        }

        const auth = await new google.auth.JWT(
            process.env.GAPI_SERVICE_EMAIL,
            undefined,
            process.env.GAPI_SERVICE_PRIVATE_KEY,
            GAPI_SCOPES.join(' '),
        );

        console.log('Authenticated to Google API success.');

        // Create each event with delay
        events.forEach(async (e: Event) => {
            const eventRes = await calendar.events.insert({
                auth: auth,
                calendarId: process.env.CALENDAR_ID,
                requestBody: e,
            });
            console.log(`Event create on ${eventRes.data.created}. Link to calendar: ${eventRes.data.htmlLink}`);
            // await delay(1000)
        });

        console.log('Created Google Calendar events success.');
        return {
            statusCode: 200,
            body: JSON.stringify({
                message:
                    'Sync Tanda shifts to Google Calendar from to completed!\nPlease check your calendar for new shifts.',
            }),
        };
    } catch (err) {
        // console.log(err);
        console.log(err, null, 2);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to schedule up your next shifts.',
            }),
        };
    }
};
