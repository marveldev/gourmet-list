import {
	arrayUnion,
	collection,
	doc,
	deleteDoc,
	getDoc,
	getDocs,
	limit,
	onSnapshot,
	query,
	serverTimestamp,
	setDoc,
	updateDoc,
	where,
	writeBatch,
	addDoc,
	arrayRemove,
} from "firebase/firestore"
import { db } from "../firebase"

export function listenToItems(type, listId, callback, onError) {
	if (!listId) return () => {}

	const path =
		type === "private"
			? collection(db, "shoppingLists", listId, "items")
			: collection(db, "sharedLists", listId, "items")

	return onSnapshot(
		path,
		(snapshot) => {
			const items = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}))
			callback(items)
		},
		(error) => {
			console.error("listenToItems error:", error)
			if (onError) onError(error)
		},
	)
}

export async function leaveSharedList(listId, currentUser) {
	const listRef = doc(db, "sharedLists", listId)
	const listSnapshot = await getDoc(listRef)

	if (!listSnapshot.exists()) {
		throw new Error("Shared list not found")
	}

	const list = listSnapshot.data()
	const ownerId = list.ownerId
	const batch = writeBatch(db)

	batch.update(listRef, {
		members: arrayRemove(currentUser.uid),
	})

	if (ownerId && ownerId !== currentUser.uid) {
		const notificationRef = doc(collection(db, "notifications"))
		batch.set(notificationRef, {
			type: "memberLeft",
			listId,
			fromUid: currentUser.uid,
			fromEmail: currentUser.email,
			toUid: ownerId,
			createdAt: serverTimestamp(),
			read: false,
		})
	}

	await batch.commit()
}

export function listenToPendingInvites(userId, callback) {
	if (!userId) {
		callback([])
		return () => {}
	}

	const invitesQuery = query(
		collection(db, "invites"),
		where("toUid", "==", userId), // ✅ FIXED
		where("status", "==", "pending"),
	)

	return onSnapshot(invitesQuery, (snapshot) => {
		const invites = snapshot.docs
			.map((inviteDoc) => ({
				id: inviteDoc.id,
				...inviteDoc.data(),
			}))
			.sort((a, b) => {
				const aSeconds = a.createdAt?.seconds || 0
				const bSeconds = b.createdAt?.seconds || 0
				return bSeconds - aSeconds
			})

		callback(invites)
	})
}

export const createSharedList = async (user) => {
	const listRef = await addDoc(collection(db, "sharedLists"), {
		ownerId: user.uid,
		ownerEmail: user.email,
		members: [user.uid],
		name: "Shared List",
		createdAt: serverTimestamp(),
	})

	return listRef.id
}

export const createListInvite = async ({ listId, fromUser, toUid }) => {
	await addDoc(collection(db, "invites"), {
		listId,
		fromUid: fromUser.uid,
		fromEmail: fromUser.email,
		toUid,
		status: "pending",
		createdAt: serverTimestamp(),
	})
}

export async function acceptInvite(inviteId, currentUser) {
	const inviteRef = doc(db, "invites", inviteId)
	const inviteSnapshot = await getDoc(inviteRef)

	if (!inviteSnapshot.exists()) throw new Error("Invite not found")

	const invite = inviteSnapshot.data()

	const batch = writeBatch(db)
	const notificationRef = doc(collection(db, "notifications"))

	// Add user to shared list members
	const listRef = doc(db, "sharedLists", invite.listId)

	batch.update(listRef, {
		members: arrayUnion(currentUser.uid),
	})

	// mark invite accepted
	batch.update(inviteRef, {
		status: "accepted",
		respondedAt: serverTimestamp(),
	})

	batch.set(notificationRef, {
		type: "inviteAccepted",
		listId: invite.listId,
		fromUid: currentUser.uid,
		fromEmail: currentUser.email,
		toUid: invite.fromUid,
		createdAt: serverTimestamp(),
		read: false,
	})

	await batch.commit()

	return invite
}

export async function declineInvite(inviteId, currentUser) {
	const normalizedCurrentEmail = currentUser.email?.toLowerCase()
	const inviteRef = doc(db, "invites", inviteId)
	const inviteSnapshot = await getDoc(inviteRef)

	if (!inviteSnapshot.exists()) {
		throw new Error("Invite not found")
	}

	const invite = inviteSnapshot.data()
	if (
		invite.toEmail !== normalizedCurrentEmail &&
		invite.toUid !== currentUser.uid
	) {
		throw new Error("You cannot decline this invite")
	}

	if (invite.status !== "pending") {
		throw new Error("This invite has already been handled")
	}

	await updateDoc(inviteRef, {
		status: "declined",
		respondedAt: serverTimestamp(),
	})

	return invite
}

export function listenToSharedLists(userId, callback) {
	const q = query(
		collection(db, "sharedLists"),
		where("members", "array-contains", userId),
	)

	return onSnapshot(q, (snapshot) => {
		const lists = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}))

		callback(lists)
	})
}

export function listenToNotifications(userId, callback) {
	if (!userId) {
		callback([])
		return () => {}
	}

	const notificationsQuery = query(
		collection(db, "notifications"),
		where("toUid", "==", userId),
		where("read", "==", false),
	)

	return onSnapshot(notificationsQuery, (snapshot) => {
		const notifications = snapshot.docs
			.map((notificationDoc) => ({
				id: notificationDoc.id,
				...notificationDoc.data(),
			}))
			.sort((a, b) => {
				const aSeconds = a.createdAt?.seconds || 0
				const bSeconds = b.createdAt?.seconds || 0
				return bSeconds - aSeconds
			})

		callback(notifications)
	})
}

export async function dismissNotification(notificationId) {
	await updateDoc(doc(db, "notifications", notificationId), {
		read: true,
	})
}

export async function deleteSharedList(listId, currentUser) {
	const listRef = doc(db, "sharedLists", listId)
	const listSnapshot = await getDoc(listRef)

	if (!listSnapshot.exists()) {
		throw new Error("Shared list not found")
	}

	const list = listSnapshot.data()
	const ownerId = list.ownerId

	if (!currentUser?.uid || ownerId !== currentUser.uid) {
		throw new Error("Only the owner can delete this list")
	}

	const batch = writeBatch(db)

	// Delete all items in the subcollection
	const itemsSnap = await getDocs(
		collection(db, "sharedLists", listId, "items"),
	)
	itemsSnap.docs.forEach((itemDoc) => {
		batch.delete(itemDoc.ref)
	})

	// Notify each member (except owner) that this list was deleted
	const members = Array.isArray(list.members) ? list.members : []
	members
		.filter((memberUid) => memberUid && memberUid !== ownerId)
		.forEach((memberUid) => {
			const notificationRef = doc(collection(db, "notifications"))
			batch.set(notificationRef, {
				type: "listDeleted",
				listId,
				fromUid: currentUser.uid,
				fromEmail: currentUser.email || list.ownerEmail,
				toUid: memberUid,
				createdAt: serverTimestamp(),
				read: false,
			})
		})

	// Delete the parent shared list document
	batch.delete(listRef)

	await batch.commit()
}
