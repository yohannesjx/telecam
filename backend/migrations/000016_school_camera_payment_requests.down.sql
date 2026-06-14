ALTER TABLE payments DROP CONSTRAINT payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK (
    method IN ('CASH', 'BANK_TRANSFER', 'TELEBIRR', 'MANUAL')
);

DROP TABLE IF EXISTS school_camera_payment_requests;
