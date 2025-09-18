import nodemailer from 'nodemailer';
import { Appointment } from '../models/Appointment';
import { Service } from '../models/Service';

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendConfirmationEmail(
    email: string,
    appointment: Appointment,
    service: Service,
    language: 'en' | 'zh'
  ) {
    const isZh = language === 'zh';

    const subject = isZh
      ? '预约确认 - 理发服务'
      : 'Appointment Confirmation - Haircut Service';

    const serviceName = isZh ? service.nameZh : service.nameEn;
    const startTime = new Date(appointment.startTime).toLocaleString(
      isZh ? 'zh-CN' : 'en-US'
    );

    const cancelLink = `${process.env.CLIENT_URL}/appointment/cancel/${appointment.id}`;
    const modifyLink = `${process.env.CLIENT_URL}/appointment/modify/${appointment.id}`;

    const html = isZh
      ? `
        <h2>预约确认</h2>
        <p>您的预约已确认！</p>
        <h3>预约详情：</h3>
        <ul>
          <li>服务项目：${serviceName}</li>
          <li>预约时间：${startTime}</li>
          <li>价格：¥${appointment.totalPrice}</li>
        </ul>
        <p>
          <a href="${modifyLink}">修改预约</a> |
          <a href="${cancelLink}">取消预约</a>
        </p>
        <p><small>请注意：预约前24小时内不可取消或修改。</small></p>
      `
      : `
        <h2>Appointment Confirmation</h2>
        <p>Your appointment has been confirmed!</p>
        <h3>Appointment Details:</h3>
        <ul>
          <li>Service: ${serviceName}</li>
          <li>Time: ${startTime}</li>
          <li>Price: $${appointment.totalPrice}</li>
        </ul>
        <p>
          <a href="${modifyLink}">Modify Appointment</a> |
          <a href="${cancelLink}">Cancel Appointment</a>
        </p>
        <p><small>Note: Cancellations and modifications are not allowed within 24 hours of the appointment.</small></p>
      `;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  async sendCancellationEmail(
    email: string,
    appointment: Appointment,
    service: Service,
    language: 'en' | 'zh'
  ) {
    const isZh = language === 'zh';

    const subject = isZh
      ? '预约取消通知'
      : 'Appointment Cancellation Notice';

    const serviceName = isZh ? service.nameZh : service.nameEn;
    const startTime = new Date(appointment.startTime).toLocaleString(
      isZh ? 'zh-CN' : 'en-US'
    );

    const html = isZh
      ? `
        <h2>预约已取消</h2>
        <p>您的以下预约已被取消：</p>
        <ul>
          <li>服务项目：${serviceName}</li>
          <li>原定时间：${startTime}</li>
        </ul>
        <p>如需重新预约，请访问我们的预约系统。</p>
      `
      : `
        <h2>Appointment Cancelled</h2>
        <p>Your following appointment has been cancelled:</p>
        <ul>
          <li>Service: ${serviceName}</li>
          <li>Original Time: ${startTime}</li>
        </ul>
        <p>To book a new appointment, please visit our booking system.</p>
      `;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send cancellation email:', error);
    }
  }

  async sendReminderEmail(
    email: string,
    appointment: Appointment,
    service: Service,
    language: 'en' | 'zh'
  ) {
    const isZh = language === 'zh';

    const subject = isZh
      ? '预约提醒 - 明天'
      : 'Appointment Reminder - Tomorrow';

    const serviceName = isZh ? service.nameZh : service.nameEn;
    const startTime = new Date(appointment.startTime).toLocaleString(
      isZh ? 'zh-CN' : 'en-US'
    );

    const html = isZh
      ? `
        <h2>预约提醒</h2>
        <p>您有一个明天的预约：</p>
        <ul>
          <li>服务项目：${serviceName}</li>
          <li>预约时间：${startTime}</li>
          <li>价格：¥${appointment.totalPrice}</li>
        </ul>
        <p>期待为您服务！</p>
      `
      : `
        <h2>Appointment Reminder</h2>
        <p>You have an appointment tomorrow:</p>
        <ul>
          <li>Service: ${serviceName}</li>
          <li>Time: ${startTime}</li>
          <li>Price: $${appointment.totalPrice}</li>
        </ul>
        <p>We look forward to serving you!</p>
      `;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send reminder email:', error);
    }
  }
}