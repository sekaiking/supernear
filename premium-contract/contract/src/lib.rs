use std::collections::HashMap;

use near_sdk::{
    collections::{LookupMap, UnorderedMap},
    env,
    json_types::U128,
    log, near, AccountId, BorshStorageKey, NearToken, PanicOnDefault, Promise,
};

mod migration;
mod subscription;
mod utils;

use crate::subscription::*;
use crate::utils::FeeFraction;

type SubscriptionName = String;
type ReferralAccountId = AccountId;
type SubscriptionEnds = u128;
type SubscriptionEndsOutput = String;

const SUPER_TREASURY_ACCOUNT_ID: &str = "super.near";
const YEAR_IN_MS: u128 = 31556926000;
const MIN_DEPOSIT: NearToken = NearToken::from_yoctonear(1_000_000_000_000_000_000_000_000);

#[derive(BorshStorageKey)]
#[near]
enum StorageKey {
    Subscriptions,
    Referrals,
    ReferralRewards,
    AccountSubscriptions,
    AccountSubscription { account_id: AccountId },
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct SuperPremium {
    owner_id: AccountId,
    // list of available subscriptions
    subscriptions: UnorderedMap<SubscriptionName, VSubscription>,
    // total deposits
    deposits: NearToken,
    // num of performed operation to buy premium
    operations: u64,
    // list of accounts and their last referrals
    referrals: UnorderedMap<AccountId, ReferralAccountId>,
    // referral fee for regular referrals
    referral_fee: FeeFraction,
    // referral fee for referrals with active premium
    premium_referral_fee: FeeFraction,
    // historical rewards for each referral
    referral_rewards: LookupMap<ReferralAccountId, NearToken>,
    // total historical rewards
    total_referral_rewards: NearToken,
    // list of accounts and when their subscription
    // account_subscriptions: LookupMap<AccountId, SubscriptionEnds>,
    account_subscriptions: LookupMap<AccountId, UnorderedMap<String, AccountSubscription>>,
}

#[near]
impl SuperPremium {
    #[init]
    pub fn new() -> Self {
        Self {
            owner_id: "super_near.near".parse().unwrap(),
            subscriptions: UnorderedMap::new(StorageKey::Subscriptions),
            deposits: NearToken::from_yoctonear(0),
            operations: 0,
            referrals: UnorderedMap::new(StorageKey::Referrals),
            referral_fee: FeeFraction {
                numerator: 1,
                denominator: 20,
            },
            premium_referral_fee: FeeFraction {
                numerator: 1,
                denominator: 10,
            },
            referral_rewards: LookupMap::new(StorageKey::ReferralRewards),
            total_referral_rewards: NearToken::from_yoctonear(0),
            account_subscriptions: LookupMap::new(StorageKey::AccountSubscriptions),
        }
    }

    #[payable]
    pub fn purchase(
        &mut self,
        name: SubscriptionName,
        receiver_id: Option<AccountId>,
        referral_id: Option<ReferralAccountId>,
    ) -> SubscriptionEndsOutput {
        let receiver_id = receiver_id.unwrap_or(env::predecessor_account_id());

        let referral_account_id = if let Some(referral_id) = referral_id {
            // referral id was provided in the request
            assert!(referral_id != receiver_id, "ERR_SELF_REFERRAL_NOT_ALLOWED");
            Some(referral_id)
        } else {
            // previously stored referral id
            self.referrals.get(&receiver_id)
        };

        let amount = env::attached_deposit();
        assert!(amount >= MIN_DEPOSIT, "Deposit {} required", MIN_DEPOSIT);

        self.assert_subscription(&name);

        let now: u128 = env::block_timestamp_ms().into();

        let mut user_subs = self
            .account_subscriptions
            .get(&receiver_id)
            .unwrap_or_else(|| {
                UnorderedMap::new(StorageKey::AccountSubscription {
                    account_id: receiver_id.clone(),
                })
            });

        let paid_until: u128 = user_subs
            .get(&name)
            .map(|sub| sub.subscription_ends)
            .unwrap_or(now);

        let referral_paid_until = if let Some(referral_id) = referral_account_id.clone() {
            if let Some(referral_subs) = self.account_subscriptions.get(&referral_id) {
                referral_subs
                    .get(&name)
                    .map(|sub| sub.subscription_ends)
                    .unwrap_or(now)
            } else {
                now
            }
        } else {
            0
        };

        let referral_is_premium = referral_paid_until > now;

        // store affiliate reward
        if let Some(referral_id) = referral_account_id {
            self.referrals.insert(&receiver_id, &referral_id);

            let prev_referral_reward = self.referral_rewards.get(&referral_id).unwrap_or_default();
            let referral_reward = if referral_is_premium {
                self.premium_referral_fee.multiply(amount)
            } else {
                self.referral_fee.multiply(amount)
            };
            self.referral_rewards.insert(
                &referral_id,
                &(prev_referral_reward.saturating_add(referral_reward)),
            );
            self.total_referral_rewards =
                self.total_referral_rewards.saturating_add(referral_reward);

            log!(
                "{}Referral reward for {}: {} yNEAR",
                if referral_is_premium { "Premium " } else { "" },
                referral_id,
                referral_reward.to_string()
            );

            Promise::new(referral_id).transfer(referral_reward);
        }

        let subscription = self.internal_get_subscription(&name);

        let previously_purchased_ms = if paid_until > now {
            paid_until - now
        } else {
            0
        };

        let purchased_period_ms =
            self.get_subscription_purchased_period_ms(&subscription, amount.as_yoctonear());

        let subscription_timestamp = now + purchased_period_ms + previously_purchased_ms;

        self.deposits = self.deposits.saturating_add(amount);
        self.operations += 1;

        user_subs.insert(
            &name,
            &AccountSubscription {
                subscription_ends: subscription_timestamp,
            },
        );

        // save main map
        self.account_subscriptions.insert(&receiver_id, &user_subs);

        subscription_timestamp.to_string()
    }

    #[payable]
    pub fn transfer(
        &mut self,
        name: SubscriptionName,
        receiver_id: AccountId,
    ) -> SubscriptionEndsOutput {
        assert_eq!(
            env::attached_deposit(),
            NearToken::from_yoctonear(1),
            "ERR_ONE_YOCTO_REQUIRED"
        );

        let sender_id = env::predecessor_account_id();

        self.assert_subscription(&name);

        assert_ne!(receiver_id, sender_id, "ERR_SENDER_IS_RECEIVER");

        let now: u128 = env::block_timestamp_ms().into();

        let mut sender_subs = self
            .account_subscriptions
            .get(&sender_id)
            .unwrap_or_else(|| {
                UnorderedMap::new(StorageKey::AccountSubscription {
                    account_id: sender_id.clone(),
                })
            });

        let sender_paid_until = if let Some(sender_sub) = sender_subs.get(&name) {
            sender_sub.subscription_ends
        } else {
            panic!("ERR_SENDER_SUBSCRIPTION_NOT_FOUND")
        };

        assert!(sender_paid_until > now, "ERR_SENDER_SUBSCRIPTION_NOT_FOUND");

        let mut receiver_subs = self
            .account_subscriptions
            .get(&receiver_id)
            .unwrap_or_else(|| {
                UnorderedMap::new(StorageKey::AccountSubscription {
                    account_id: receiver_id.clone(),
                })
            });

        let receiver_paid_until = if let Some(receiver_sub) = receiver_subs.get(&name) {
            std::cmp::max(now, receiver_sub.subscription_ends)
        } else {
            now
        };

        let sender_previous_purchased_ms = sender_paid_until - now;

        let receiver_timestamp = sender_previous_purchased_ms + receiver_paid_until;

        self.operations += 1;

        sender_subs.insert(
            &name,
            &AccountSubscription {
                subscription_ends: now,
            },
        );
        receiver_subs.insert(
            &name,
            &AccountSubscription {
                subscription_ends: receiver_timestamp,
            },
        );

        // save main map
        self.account_subscriptions
            .insert(&receiver_id, &receiver_subs);
        self.account_subscriptions.insert(&sender_id, &sender_subs);

        receiver_timestamp.to_string()
    }

    pub fn set_referral_fee(&mut self, referral_fee: FeeFraction) {
        self.assert_owner();
        referral_fee.assert_valid();
        self.referral_fee = referral_fee;
    }

    pub fn set_premium_referral_fee(&mut self, premium_referral_fee: FeeFraction) {
        self.assert_owner();
        premium_referral_fee.assert_valid();
        self.premium_referral_fee = premium_referral_fee;
    }

    pub fn add_subscription(
        &mut self,
        name: SubscriptionName,
        title: String,
        description: String,
        image_url: String,
        price: U128,
        price_wholesale: U128,
    ) {
        self.assert_owner();

        let subscription = Subscription {
            title,
            description,
            image_url,
            price: price.0,
            price_wholesale: price_wholesale.0,
        };

        self.subscriptions
            .insert(&name, &VSubscription::Current(subscription));
    }

    pub fn get_subscription(&self, name: SubscriptionName) -> SubscriptionOutput {
        self.subscriptions
            .get(&name)
            .expect("ERR_NO_SUBSCRIPTION")
            .into()
    }

    pub fn get_user_subscription(
        &self,
        user_id: AccountId,
        name: SubscriptionName,
    ) -> AccountSubscriptionOutput {
        self.account_subscriptions
            .get(&user_id)
            .expect("ERR_NOT_SUBSCRIBED")
            .get(&name)
            .expect("ERR_NOT_SUBSCRIBED")
            .into()
    }

    pub fn get_user_subscriptions(
        &self,
        user_id: AccountId,
    ) -> HashMap<String, AccountSubscriptionOutput> {
        let mut user_subs: HashMap<String, AccountSubscriptionOutput> = HashMap::new();

        if let Some(subscriptions) = self.account_subscriptions.get(&user_id) {
            for (id, subscription) in subscriptions.iter() {
                user_subs.insert(
                    id,
                    AccountSubscriptionOutput {
                        subscription_ends: subscription.subscription_ends.to_string(),
                    },
                );
            }
        }

        user_subs
    }

    pub fn get_referral_reward(&self, referral_account_id: ReferralAccountId) -> U128 {
        U128::from(
            self.referral_rewards
                .get(&referral_account_id)
                .unwrap_or_default()
                .as_yoctonear(),
        )
    }

    pub fn get_total_referral_rewards(&self) -> U128 {
        U128::from(self.total_referral_rewards.as_yoctonear())
    }

    pub fn get_deposits_without_referral_fees(&self) -> U128 {
        U128::from(
            self.deposits
                .saturating_sub(self.total_referral_rewards)
                .as_yoctonear(),
        )
    }

    pub fn get_affiliates(&self, referral_account_id: ReferralAccountId) -> Vec<AccountId> {
        self.referrals
            .into_iter()
            .filter(|(_, _referral_account_id)| (referral_account_id == *_referral_account_id))
            .map(|(user_account_id, _)| user_account_id)
            .collect()
    }

    pub fn get_deposits(&self) -> U128 {
        U128::from(self.deposits.as_yoctonear())
    }

    pub fn get_operations(&self) -> u64 {
        self.operations
    }

    pub fn get_referral_id(&self, account_id: AccountId) -> Option<AccountId> {
        self.referrals.get(&account_id)
    }

    pub fn get_referral_fee(&self) -> FeeFraction {
        self.referral_fee.clone()
    }

    pub fn get_premium_referral_fee(&self) -> FeeFraction {
        self.premium_referral_fee.clone()
    }

    pub fn withdraw_deposits(
        &mut self,
        amount: NearToken,
        destination_account_id: Option<AccountId>,
    ) -> Promise {
        self.assert_owner();

        assert!(self.deposits >= amount, "ERR_NOT_ENOUGH_DEPOSITS");

        self.deposits = self.deposits.saturating_sub(amount);

        let destination_account_id: AccountId =
            destination_account_id.unwrap_or(SUPER_TREASURY_ACCOUNT_ID.parse().unwrap());

        Promise::new(destination_account_id).transfer(amount)
    }

    pub fn get_purchase_ms(&self, name: SubscriptionName, amount: U128) -> U128 {
        let subscription = self.internal_get_subscription(&name);
        U128::from(self.get_subscription_purchased_period_ms(&subscription, amount.0))
    }
}

impl SuperPremium {
    pub(crate) fn internal_get_subscription(
        &self,
        subscription_name: &SubscriptionName,
    ) -> Subscription {
        Subscription::from(
            self.subscriptions
                .get(subscription_name)
                .expect("ERR_SUBSCRIPTION_NOT_FOUND"),
        )
    }

    fn get_subscription_price(&self, subscription: &Subscription, is_wholesale: bool) -> u128 {
        if is_wholesale {
            subscription.price_wholesale
        } else {
            subscription.price
        }
    }

    pub fn get_subscription_purchased_period_ms(
        &self,
        subscription: &Subscription,
        amount: u128,
    ) -> u128 {
        let price =
            self.get_subscription_price(subscription, amount >= subscription.price_wholesale);

        (U256::from(amount) * U256::from(YEAR_IN_MS) / U256::from(price)).as_u128()
    }
}

use uint::construct_uint;
construct_uint! {
    /// 256-bit unsigned integer.
    pub struct U256(4);
}
