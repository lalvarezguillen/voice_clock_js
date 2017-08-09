import test from 'ava'
import getSourceIP from './index'

test('getSourceIP prefers res.ip over xforwardedfor', t => {
    const req = {
        ip: '86.24.2.15',
        headers: {
            'x-forwarded-for': '88.24.2.15'
        }
    }
    const source_ip = getSourceIP(req)
    t.deepEqual(source_ip, '86.24.2.15')
})