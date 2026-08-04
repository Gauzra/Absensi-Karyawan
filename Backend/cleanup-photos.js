import { promisePool } from './config/db.js';

async function cleanupOldPhotos() {
    try {
        console.log('🧹 Mulai hapus foto lama...');
        
        // Hapus foto yang lebih dari 6 bulan
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const dateThreshold = sixMonthsAgo.toISOString().split('T')[0];
        
        const [result] = await promisePool.execute(
            'UPDATE attendance SET photo = NULL WHERE date < ? AND photo IS NOT NULL',
            [dateThreshold]
        );
        
        console.log(`✅ Selesai! ${result.affectedRows} foto dihapus`);
        process.exit(0); // Keluar program
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

cleanupOldPhotos();