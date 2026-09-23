/**
 * Initialize Demo Scheduler Data
 *
 * Fase 1 (23 Sep 2026): demosDummyData used to be a copy of the same
 * hospital/HMS-software demo schedule as populateCRMData.ts's old (now
 * removed) demos block -- product demos to "RS Harapan Sehat", "Klinik
 * Sehat Bersama", etc. for "HMS Enterprise"/"Telemedicine Module"/etc.
 * Rewritten to Onduline product demo visits (roofing/waterproofing/solar)
 * to the same kind of clients used in populateCRMData.ts's dummy dataset.
 */

const LS_KEY_DEMOS = 'sales_monitoring_demos';

// Demo Data with Advanced Scheduling
const demosDummyData = [
  {
    id: 'D001',
    title: 'Demo Onduline Classic - Toko Bangunan Makmur Jaya',
    leadName: 'Hendra Wijaya',
    company: 'Toko Bangunan Makmur Jaya',
    date: new Date(2026, 1, 10, 10, 0), // Feb 10, 2026, 10:00 AM
    time: '10:00',
    duration: 60,
    presenter: 'Budi Santoso',
    product: 'Onduline Classic',
    status: 'scheduled',
    meetingLink: 'https://meet.zoom.us/demo-e001',
    notes: 'Fokus pada ketahanan produk dan margin keuntungan untuk toko',
    attendees: [
      {
        id: 'A001',
        name: 'Hendra Wijaya',
        email: 'hendra@makmurjayabangunan.co.id',
        type: 'external',
        rsvp: 'accepted'
      },
      {
        id: 'A002',
        name: 'Ratna Kartika',
        email: 'ratna@makmurjayabangunan.co.id',
        type: 'external',
        rsvp: 'pending'
      },
      {
        id: 'A003',
        name: 'Budi Santoso',
        email: 'budi.santoso@onduline.co.id',
        type: 'internal',
        rsvp: 'accepted'
      }
    ],
    resources: [
      {
        id: 'R001',
        name: 'Meeting Room A',
        type: 'room'
      },
      {
        id: 'R002',
        name: 'Sample Board Onduline Classic',
        type: 'equipment'
      },
      {
        id: 'R003',
        name: 'Zoom Premium',
        type: 'software'
      }
    ],
    bufferTime: {
      before: 15,
      after: 15
    }
  },
  {
    id: 'D002',
    title: 'Demo Waterproofing Membrane - Toko Material Sumber Rejeki',
    leadName: 'Ratna Kartika',
    company: 'Toko Material Sumber Rejeki',
    date: new Date(2026, 1, 12, 14, 0), // Feb 12, 2026, 2:00 PM
    time: '14:00',
    duration: 45,
    presenter: 'Siti Nurhaliza',
    product: 'Waterproofing Membrane',
    status: 'scheduled',
    meetingLink: 'https://meet.zoom.us/demo-p001',
    notes: 'Tunjukkan cara aplikasi membrane dan potensi margin reseller',
    attendees: [
      {
        id: 'A004',
        name: 'Ratna Kartika',
        email: 'sumberrejeki.material@gmail.com',
        type: 'external',
        rsvp: 'accepted'
      },
      {
        id: 'A005',
        name: 'Siti Nurhaliza',
        email: 'siti.nurhaliza@onduline.co.id',
        type: 'internal',
        rsvp: 'accepted'
      }
    ],
    resources: [
      {
        id: 'R004',
        name: 'Meeting Room B',
        type: 'room'
      },
      {
        id: 'R005',
        name: 'Google Meet',
        type: 'software'
      }
    ],
    bufferTime: {
      before: 10,
      after: 10
    }
  },
  {
    id: 'D003',
    title: 'Demo Ondugreen Roof System - PT Agro Lestari Nusantara',
    leadName: 'Hendra Gunawan',
    company: 'PT Agro Lestari Nusantara',
    date: new Date(2026, 1, 15, 11, 0), // Feb 15, 2026, 11:00 AM
    time: '11:00',
    duration: 30,
    presenter: 'Dewi Lestari',
    product: 'Ondugreen Roof System',
    status: 'scheduled',
    meetingLink: 'https://meet.zoom.us/demo-emr001',
    notes: 'Demo dasar sistem green roof untuk gudang dan fasilitas pertanian',
    attendees: [
      {
        id: 'A006',
        name: 'Hendra Gunawan',
        email: 'facility@agrolestari.co.id',
        type: 'external',
        rsvp: 'pending'
      },
      {
        id: 'A007',
        name: 'Dewi Lestari',
        email: 'dewi.lestari@onduline.co.id',
        type: 'internal',
        rsvp: 'accepted'
      }
    ],
    resources: [
      {
        id: 'R006',
        name: 'Microsoft Teams',
        type: 'software'
      }
    ],
    bufferTime: {
      before: 5,
      after: 10
    }
  },
  {
    id: 'D004',
    title: 'Follow-up Demo Onduline Bitumen - Resort & Villa Ciwidey',
    leadName: 'Ir. Johanes Surya',
    company: 'Resort & Villa Ciwidey',
    date: new Date(2026, 1, 5, 15, 0), // Feb 5, 2026, 3:00 PM (Past - Completed)
    time: '15:00',
    duration: 60,
    presenter: 'Andi Wijaya',
    product: 'Onduline Bitumen',
    status: 'completed',
    meetingLink: 'https://meet.zoom.us/demo-fb001',
    notes: 'Demo berjalan lancar, siap untuk proposal. Client sangat tertarik dengan kombinasi atap bitumen dan Ondusolar.',
    attendees: [
      {
        id: 'A008',
        name: 'Ir. Johanes Surya',
        email: 'facility@villaciwidey.co.id',
        type: 'external',
        rsvp: 'accepted'
      },
      {
        id: 'A009',
        name: 'Rina Finance Director',
        email: 'rina@villaciwidey.co.id',
        type: 'external',
        rsvp: 'accepted'
      },
      {
        id: 'A010',
        name: 'Andi Wijaya',
        email: 'andi.wijaya@onduline.co.id',
        type: 'internal',
        rsvp: 'accepted'
      }
    ],
    resources: [
      {
        id: 'R007',
        name: 'Conference Room Executive',
        type: 'room'
      },
      {
        id: 'R008',
        name: 'LED Display 65"',
        type: 'equipment'
      },
      {
        id: 'R009',
        name: 'Zoom Enterprise',
        type: 'software'
      }
    ],
    bufferTime: {
      before: 20,
      after: 15
    },
    rating: 5,
    reviewerName: 'Ir. Johanes Surya',
    reviewDate: new Date(2026, 1, 5, 16, 30),
    reviewText: 'Presentasi demo yang sangat baik! Presenter menguasai produk dan menjawab semua pertanyaan kami. Kombinasi atap bitumen dan panel Ondusolar sangat sesuai kebutuhan resort kami. Tim teknis kami terkesan dengan detail pemasangannya. Sangat direkomendasikan untuk proyek resort skala besar.'
  },
  {
    id: 'D005',
    title: 'Demo Ondusolar Panel Kit - PT Graha Properti Sentosa',
    leadName: 'Caroline Halim',
    company: 'PT Graha Properti Sentosa',
    date: new Date(2026, 1, 18, 13, 0), // Feb 18, 2026, 1:00 PM
    time: '13:00',
    duration: 45,
    presenter: 'Rudi Hartono',
    product: 'Ondusolar Panel Kit',
    status: 'scheduled',
    meetingLink: 'https://meet.zoom.us/demo-tele001',
    notes: 'Demo fokus pada efisiensi panel surya dan estimasi ROI untuk proyek properti',
    attendees: [
      {
        id: 'A011',
        name: 'Caroline Halim',
        email: 'caroline@grahapropertisentosa.co.id',
        type: 'external',
        rsvp: 'accepted'
      },
      {
        id: 'A012',
        name: 'Procurement Manager',
        email: 'procurement@grahapropertisentosa.co.id',
        type: 'external',
        rsvp: 'accepted'
      },
      {
        id: 'A013',
        name: 'Rudi Hartono',
        email: 'rudi.hartono@onduline.co.id',
        type: 'internal',
        rsvp: 'accepted'
      }
    ],
    resources: [
      {
        id: 'R010',
        name: 'Meeting Room C',
        type: 'room'
      },
      {
        id: 'R011',
        name: 'Ondusolar Demo Kit',
        type: 'equipment'
      },
      {
        id: 'R012',
        name: 'Google Meet',
        type: 'software'
      }
    ],
    bufferTime: {
      before: 15,
      after: 10
    }
  },
  {
    id: 'D006',
    title: 'Demo Onduline Classic - PT Kontraktor Depok Sejahtera',
    leadName: 'Hadi Sutrisno',
    company: 'PT Kontraktor Depok Sejahtera',
    date: new Date(2026, 1, 3, 10, 0), // Feb 3, 2026 (Past - Completed)
    time: '10:00',
    duration: 60,
    presenter: 'Budi Santoso',
    product: 'Onduline Classic',
    status: 'completed',
    meetingLink: 'https://meet.zoom.us/demo-her001',
    notes: 'Demo sukses, client tertarik dengan paket aksesoris pemasangan. Follow-up untuk proposal.',
    attendees: [
      {
        id: 'A014',
        name: 'Hadi Sutrisno',
        email: 'hadi@kontraktordepok.co.id',
        type: 'external',
        rsvp: 'accepted'
      },
      {
        id: 'A015',
        name: 'Head of Procurement',
        email: 'procurement@kontraktordepok.co.id',
        type: 'external',
        rsvp: 'accepted'
      },
      {
        id: 'A016',
        name: 'Budi Santoso',
        email: 'budi.santoso@onduline.co.id',
        type: 'internal',
        rsvp: 'accepted'
      }
    ],
    resources: [
      {
        id: 'R013',
        name: 'Conference Room 1',
        type: 'room'
      },
      {
        id: 'R014',
        name: 'Projector HD',
        type: 'equipment'
      },
      {
        id: 'R015',
        name: 'Zoom Business',
        type: 'software'
      }
    ],
    bufferTime: {
      before: 15,
      after: 15
    },
    rating: 4,
    reviewerName: 'Hadi Sutrisno',
    reviewDate: new Date(2026, 1, 3, 11, 30),
    reviewText: 'Demo yang bagus. Paket aksesoris pemasangannya cukup lengkap dan akan meningkatkan efisiensi proyek kami. Presenter menjelaskan proses instalasi dengan jelas. Kami perlu info lebih lanjut soal jadwal pengiriman, tapi secara keseluruhan kami sangat tertarik.'
  },
  {
    id: 'D007',
    title: 'Demo Waterproofing Membrane - CV Rumah Idaman Bersama',
    leadName: 'Lisa Permata Sari',
    company: 'CV Rumah Idaman Bersama',
    date: new Date(2026, 1, 20, 16, 0), // Feb 20, 2026, 4:00 PM
    time: '16:00',
    duration: 30,
    presenter: 'Dewi Lestari',
    product: 'Waterproofing Membrane + Aksesoris Pemasangan',
    status: 'scheduled',
    meetingLink: 'https://meet.zoom.us/demo-bil001',
    notes: 'Demo untuk kontraktor perumahan, fokus pada garansi dan kemudahan aplikasi',
    attendees: [
      {
        id: 'A017',
        name: 'Lisa Permata Sari',
        email: 'info@rumahidamanbersama.com',
        type: 'external',
        rsvp: 'pending'
      },
      {
        id: 'A018',
        name: 'Dewi Lestari',
        email: 'dewi.lestari@onduline.co.id',
        type: 'internal',
        rsvp: 'accepted'
      }
    ],
    resources: [
      {
        id: 'R016',
        name: 'Google Meet',
        type: 'software'
      }
    ],
    bufferTime: {
      before: 5,
      after: 10
    }
  },
  {
    id: 'D008',
    title: 'Demo Ondugreen Roof System - PT Kontraktor Bangun Persada',
    leadName: 'Bambang Sutrisno',
    company: 'PT Kontraktor Bangun Persada',
    date: new Date(2026, 1, 8, 9, 0), // Feb 8, 2026, 9:00 AM
    time: '09:00',
    duration: 90,
    presenter: 'Andi Wijaya',
    product: 'Ondugreen Roof System',
    status: 'scheduled',
    meetingLink: 'https://meet.zoom.us/demo-lis001',
    notes: 'Demo sistem green roof untuk proyek gedung bertingkat',
    attendees: [
      {
        id: 'A019',
        name: 'Bambang Sutrisno, S.T.',
        email: 'procurement@bangunpersada.co.id',
        type: 'external',
        rsvp: 'accepted'
      },
      {
        id: 'A020',
        name: 'Site Manager',
        email: 'site@bangunpersada.co.id',
        type: 'external',
        rsvp: 'accepted'
      },
      {
        id: 'A021',
        name: 'Andi Wijaya',
        email: 'andi.wijaya@onduline.co.id',
        type: 'internal',
        rsvp: 'accepted'
      },
      {
        id: 'A022',
        name: 'Technical Support',
        email: 'tech@onduline.co.id',
        type: 'internal',
        rsvp: 'accepted'
      }
    ],
    resources: [
      {
        id: 'R017',
        name: 'Innovation Lab',
        type: 'room'
      },
      {
        id: 'R018',
        name: 'Ondugreen Sample Panel',
        type: 'equipment'
      },
      {
        id: 'R019',
        name: 'Product Sandbox Environment',
        type: 'software'
      }
    ],
    bufferTime: {
      before: 30,
      after: 20
    }
  }
];


/**
 * Initialize demos data to localStorage
 */
export function initializeDemosData(): {
  success: boolean;
  message: string;
  count: number;
} {
  try {
    // Check if demos already exist
    const existingDemos = localStorage.getItem(LS_KEY_DEMOS);
    
    if (!existingDemos || JSON.parse(existingDemos).length === 0) {
      localStorage.setItem(LS_KEY_DEMOS, JSON.stringify(demosDummyData));
      console.log('✅ Demo Scheduler data initialized successfully');
      console.log(`📊 Total Demos: ${demosDummyData.length}`);
      console.log(`   - Scheduled: ${demosDummyData.filter(d => d.status === 'scheduled').length}`);
      console.log(`   - Completed: ${demosDummyData.filter(d => d.status === 'completed').length}`);
      
      return {
        success: true,
        message: `Demo Scheduler data initialized with ${demosDummyData.length} demos`,
        count: demosDummyData.length,
      };
    }
    
    const existingCount = JSON.parse(existingDemos).length;
    console.log(`ℹ️ Demo data already exists (${existingCount} demos)`);
    
    return {
      success: true,
      message: 'Demo data already exists',
      count: existingCount,
    };
  } catch (error) {
    console.error('❌ Error initializing demos:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to initialize demos',
      count: 0,
    };
  }
}

/**
 * Clear all demos from localStorage
 */
export function clearDemosData(): {
  success: boolean;
  message: string;
} {
  try {
    localStorage.removeItem(LS_KEY_DEMOS);
    console.log('🗑️ Demo Scheduler data cleared');
    
    return {
      success: true,
      message: 'Demo Scheduler data cleared successfully',
    };
  } catch (error) {
    console.error('❌ Error clearing demos:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to clear demos',
    };
  }
}

/**
 * Get demos statistics
 */
export function getDemosStatistics(): {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
} {
  try {
    const demos = JSON.parse(localStorage.getItem(LS_KEY_DEMOS) || '[]');
    
    return {
      total: demos.length,
      scheduled: demos.filter((d: any) => d.status === 'scheduled').length,
      completed: demos.filter((d: any) => d.status === 'completed').length,
      cancelled: demos.filter((d: any) => d.status === 'cancelled').length,
    };
  } catch (error) {
    console.error('❌ Error getting demos statistics:', error);
    return {
      total: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
    };
  }
}
