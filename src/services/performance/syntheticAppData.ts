import type { FamilyEvent, FamilyMember, MomentPost } from "../../types";

export type SyntheticMemoryBookItem = {
  id: string;
  createdAt: string;
  title: string;
  authorName: string;
  mediaCount: number;
};

const STRESS_MEDIA_URIS = [
  'data:image/jpeg;base64,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',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCADcAUADASIAAhEBAxEB/8QAGwABAAIDAQEAAAAAAAAAAAAAAAQFAwYHAgH/xABFEAEAAQICBAgLBAkDBQAAAAAAAQIDBBEFEiExExUXQVFUktEGFCJSYXGBk6HB0jJDkbEjNDVTYnSisuEHc/BFY3KDwv/EABkBAQADAQEAAAAAAAAAAAAAAAABAgMEBf/EACIRAQEAAgEEAwEBAQAAAAAAAAABAgMREhMhMRQyUUEEQv/aAAwDAQACEQMRAD8A6EA4XoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlYTA3cTlV9i350/KFvh8HZw+2inOrzqtsr467kplskUtrB4i7GdFqrLfnOzP8UqjRF2Z/SXaKY/hznuXA2mnH+srtqq4n/wC//R/l5r0RXEfo71NU/wAUZd63E9rH8R3MlBd0fibec8HrRHPTOefs3osxNMzExMTGyYltLHes2r9OrdoiqObPfCl0z+LTb+taFhitF1241sPM1089M7471exyxuPttMpfQAhIAAAAAAAAAAAAAAAAAAAAAAAAAAstHYDXyvX48jfTTPP6Z9DHozCcPc4WuIm3TO6eeV2216+fNZbM+PEfIiKYiIiIiNkRD6DoYAAAAAACDj8BTepmuzEU3Y5o2RV/lOEXGWcVMtl5jVpiaZmJiYmNkxIuNK4ThKOHtxGtTHlemP8ACncmeNxvDpxy6pyAKrAAAAAM9rC1Vba/Jjo50443L0c8MD7TRVVGdNMzHohPt2LdG6nOemWRtNH7VepAjD3ZjPU+MHi93zPjCeLdnFHVVbNuuM86KtnoeVo8126K/tUxKt0flT1K0SrmE2Z25z9Eo1VM01TFUZTDLLC4+0y8vgCqQAAAAAB6tW6rtym3RHlVTlDysdDWda7VemJ8jZT65/58U4zqvCMrxOVpZtU2bVNujPVp6WQHa5AAAAAAAAAABr+kMN4tfypieDq209zYEHS1nhMNrxE61vbs6Of/AJ6GezHnFfXlxVIA5XSAAPtNNVc5UxMyU0zVVEUxnMp9i1wVGW+Z3yvhh1VFvD5ZsU24iZ219LKDrkknEUAEoAAAAHm5bpuRlVHqnoehFnPsV121VaqymNnNLws66Yrpmmd0q+7bqtVZTu5p6XLs19Pmel5eXgBmsAAAAL3RNEU4KmYz8qZmfy+SibHg4iMJZiIiPIidnqa6Z5Zbb4ZgHSwAAAAAAAAAAHm5RFy3VROeVUTE5PQDVhkxMRTibsREREVzERHrY3DXYA9WqOEuU09JJz4ErCWsqeEqjbO70JBEZRlG4duOPTOGdvIAsgAAAAAAAAY71uLtGWzPmlkEWcziirmMpyneM+Mo1bkVRuq/NgcWU6bw1gAgAAGyYT9Vs/7dP5NbXuiqoqwVERO2mZifxz+bXTfLLbPCYA6WAAAAABG+ABk1Keg1KegR1RjGTUp6DUp6A6oxjJqU9BqU9AdUavi/1q9/uVfmxNj4swf7n+qrvOLMH+5/qq73NdOTebsWuJOCp21VbehdcWYP9z/VV3vdGBw1uMqLeUf+UrYarMuai7sVaLTxSx5nxk8UseZ8ZdCvdirFp4pY8z4yeKWPM+Mh3YqxaeKWPM+MniljzPjId2KsWniljzPjKLjrNFrU4OnLPPPaJmyW8IoAuAAAAw4qnWszv2bUFZ1xrUVUxvmJhWObdPPK+IAxWAAFnoW9EVV2ap3+VTH5/L8FYyYe7Ni9Rcp30zu6VsMum8q5TmcNlHm3XTcoiuiYqpndMPTscoAAAAU/aj1hT9qPWDMAMwAAAAAAAAAAAAABC0l937fkmoWkvu/b8hfX9kEBLoAAAAFWs651aKqt+UZqxz7/AOL4gDBYAAABZaJxepVGHr+zVPkznunoW7Vlvo7H6+Vm/Pl7qap5/RPpb6tn/NY7MP7FkA3YgABT9qPWFP2o9YMwAzAAAAAAAAAAAAAAELSX3ft+SahaS+79vyF9f2QQEugAAABixNWrZq25TOxASMZXnVFEc29Hcm285NMfQAzSAAAAAAnYLSNVmIt3Ymq3G6Y3wt7N61fp1rVcVRz5b4a0+01VUVRVRVNNUbpicpaY7bPFZ5a5W0CitaSxNuMpmmvo1o3JVGl6Jn9JZqpj+Gc+5tNuNZXXlFmU/aj1q/jbD+Zd/CO96t6UtV3bdFu3XM1VxHlZRlmnrx/UdGX4tAF2IAAAAAAAAAAAAAAhaS+79vyTULSX3ft+Qvr+yCAl0AADzdri3RNU/h0vUzERMzuhX37s3auimN0M9mfTEycsczMzMzvkByNAAHPeMcd13E+9q7zjHHddxPvau9FEOriJXGOO67ife1d5xjjuu4n3tXeigcRK4xx3XcT72rvOMcd13E+9q70UDiJXGOO67ife1d5xjjuu4n3tXeigcRK4xx3XcT72rvOMcd13E+9q70UDiJXGOO67ife1d6doLH4yvTmjqa8XfqpqxVqJibszExrR6VOsPB/9vaN/m7X98JntXKTprtYDueOAAAAAAAAAAAAAAIWkvu/b8k1C0l937fkL6/sgg8Xrtuxbm5euUW7dO+quqIiPbKXQ9sOLxWHwdmb2Ku0Wrcc9U79meUdM7Nyg0l4YYOzRq4CmcRcmNlVUTTRTv357Z5tnxafpHSOK0lfm7irs1bZmmjPyaPREc26GOe2T01x1W+1jpnwlxmPvVU4a5Xh8NE+RRTOVU5c8zH5bt3rVvGOO67ife1d6KOa22810zGScRK4xx3XcT72rvOMcd13E+9q70UQniJXGOO67ife1d5xjjuu4n3tXeigcQAAAAAAAAAAWHg/+3tG/zdr++FesPB/9vaN/m7X98JntGX1rtYDueMAAAAAAAAAAAAAANU8O9NYnRHiPi1FqrheE1uEiZyy1d2Ux0traF/qn/wBL/wDb/wDCmy2Y2xt/nkuyStZveE+l7vCR41qU15+TRRTGrE80Tln7c81ZiMRfxNcV4i9cu1xGUVXKpqnLo2sQ5Llb7r05jJ6AEJAAAAAAAAAAAAAAAAErReIowmk8JibkVTRZv0XKop3zEVRM5fgigWczh03lC0R1fHdij6jlC0R1fHdij6nMhr3snP8AF1um8oWiOr47sUfUcoWiOr47sUfU5kHeyPi63TeULRHV8d2KPqOULRHV8d2KPqcyDvZHxdbpvKFojq+O7FH1HKFojq+O7FH1OZB3sj4ut03lC0R1fHdij6jlC0R1fHdij6nMg72R8XW6byhaI6vjuxR9RyhaI6vjuxR9TmQd7I+LrdN5QtEdXx3Yo+o5QtEdXx3Yo+pzIO9kfF1um8oWiOr47sUfUcoWiOr47sUfU5kHeyPi63TeULRHV8d2KPqaz4aeEOE094n4nbv0cBr63C0xGetq5ZZTPRLWBXLZllOKthowwvVABRsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//9k=',
  'data:image/jpeg;base64,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',
  'data:image/jpeg;base64,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'
] as const;

const mediaUriFor = (index: number) => STRESS_MEDIA_URIS[Math.abs(index) % STRESS_MEDIA_URIS.length];
const reactions = () => ({ like: 0, love: 0, haha: 0, wow: 0, sad: 0, celebrate: 0 });

const dateForIndex = (index: number) => {
  const date = new Date();
  date.setHours(10 + (index % 8), (index * 7) % 60, 0, 0);
  date.setDate(date.getDate() - index * 2);
  return date;
};

export const syntheticMediaUri = STRESS_MEDIA_URIS[0];
export const syntheticMediaUriFor = mediaUriFor;

export function generateSyntheticMoments(count: number): MomentPost[] {
  return Array.from({ length: count }, (_, index) => {
    const date = dateForIndex(index);
    const mediaCount = index % 5 === 0 ? 4 : index % 3 === 0 ? 2 : index % 2 === 0 ? 1 : 0;
    return {
      id: `stress-moment-${count}-${index}`,
      familyId: "stress-family",
      authorUid: `stress-user-${index % 12}`,
      authorName: `Thành viên ${index % 12 + 1}`,
      caption: `Kỷ niệm thử tải ${index + 1} · một câu chuyện nhỏ của gia đình để đo khả năng hiển thị khi dữ liệu lớn.`,
      media: Array.from({ length: mediaCount }, (_, mediaIndex) => ({
        id: `stress-media-${index}-${mediaIndex}`,
        type: mediaIndex === 0 && index % 7 === 0 ? "video" as const : "image" as const,
        secureUrl: mediaUriFor(index + mediaIndex),
        thumbnailUrl: mediaUriFor(index + mediaIndex),
        publicId: `stress/${index}/${mediaIndex}`,
        width: 800,
        height: 600,
        duration: mediaIndex === 0 && index % 7 === 0 ? 12 : undefined,
      })),
      mediaAssetIds: [],
      personIds: index % 4 === 0 ? [`person-${index % 30}`] : [],
      timelineAudience: index % 5 === 0 ? "family" as const : index % 4 === 0 ? "persons" as const : "self" as const,
      notifyFamily: false,
      visibility: "family" as const,
      moderationStatus: "visible" as const,
      moderatedByUid: null,
      moderatedAt: null,
      reactionCounts: reactions(),
      commentCount: 0,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
    };
  });
}

export function generateSyntheticMembers(count = 24): FamilyMember[] {
  return Array.from({ length: count }, (_, index) => ({
    uid: `stress-user-${index}`,
    displayName: `Thành viên ${index + 1}`,
    shortName: `Người ${index + 1}`,
    color: null,
    phoneNumber: null,
    birthDate: null,
    avatarUrl: null,
    gender: index % 2 ? "female" as const : "male" as const,
    bio: null,
    bloodType: null,
    interests: [],
    role: "member" as const,
    joinedAt: new Date(2020, 0, 1).toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export function generateSyntheticEvents(count: number): FamilyEvent[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index - Math.floor(count / 3));
    const dateISO = date.toISOString();
    return {
      id: `stress-event-${count}-${index}`,
      familyId: "stress-family",
      title: index % 5 === 0 ? `Sinh nhật thành viên ${index + 1}` : `Sự kiện gia đình ${index + 1}`,
      dateISO,
      dateKey: dateISO.slice(0, 10),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      allDay: index % 3 === 0,
      eventType: index % 5 === 0 ? "birthday" : index % 7 === 0 ? "anniversary" : "family",
      notificationLevel: index % 11 === 0 ? "important" as const : index % 6 === 0 ? "notable" as const : "normal" as const,
      participantsMode: index % 3 === 0 ? "all" : "selected",
      participantIds: index % 3 === 0 ? [] : [`stress-user-${index % 12}`, `stress-user-${(index + 1) % 12}`],
      personIds: [],
      recurrence: index % 6 === 0 ? "yearly" : "none",
      description: index % 2 === 0 ? "Một hoạt động nhỏ để cả nhà cùng nhớ." : null,
      location: index % 4 === 0 ? "Nhà mình" : null,
      attachments: [],
      attachmentPublicIds: [],
      coverAttachmentId: null,
      createdByUid: `stress-user-${index % 12}`,
      moderationStatus: "visible",
      moderatedByUid: null,
      moderatedAt: null,
      createdAt: dateISO,
      updatedAt: dateISO,
    };
  });
}

export function generateSyntheticTimeline(count: number): MomentPost[] {
  return generateSyntheticMoments(count).map((moment, index) => ({
    ...moment,
    id: `stress-timeline-${count}-${index}`,
    caption: index % 6 === 0 ? `Một dấu mốc đáng nhớ ${index + 1}` : `Kỷ niệm ${index + 1}`,
    personIds: [],
    timelineAudience: "family",
    notifyFamily: false,
  }));
}

export function generateSyntheticMemoryBook(count: number): SyntheticMemoryBookItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `stress-book-${count}-${index}`,
    createdAt: dateForIndex(index).toISOString(),
    title: `Trang ký ức ${index + 1}`,
    authorName: `Thành viên ${index % 12 + 1}`,
    mediaCount: index % 4 === 0 ? 6 : index % 2 === 0 ? 2 : 1,
  }));
}
