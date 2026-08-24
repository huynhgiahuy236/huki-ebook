# Shipping Service Error Codes

Shipment, Address errors.

## SHIPMENT_* - Shipment

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| SHIPMENT_NOT_FOUND | 404 | Vận đơn không tìm thấy | Check shipment ID |
| SHIPMENT_STATUS_TRANSITION_INVALID | 400 | Trạng thái vận chuyển không hợp lệ | - |
| SHIPMENT_CANNOT_CANCEL | 400 | Không thể hủy vận đơn | Check shipment status |
| SHIPMENT_STAFF_NOT_FOUND | 404 | Nhân viên giao hàng không tìm thấy | Check staff ID |
| SHIPMENT_STAFF_INACTIVE | 400 | Nhân viên giao hàng không hoạt động | Select active staff |
| SHIPMENT_CARRIER_ERROR | 502 | Lỗi nhà vận chuyển | Retry later |

## ADDRESS_* - Address

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| ADDRESS_NOT_FOUND | 404 | Địa chỉ không tìm thấy | Check address ID |
| ADDRESS_DEFAULT_INVALID | 400 | Không thể xóa địa chỉ mặc định | Set new default first |
