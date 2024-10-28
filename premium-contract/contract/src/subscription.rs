use crate::*;

#[near(serializers=[borsh])]
pub enum VSubscription {
    Current(Subscription),
}

#[near(serializers=[borsh])]
pub struct Subscription {
    pub title: String,
    pub description: String,
    pub image_url: String,
    pub price: u128,
    pub price_wholesale: u128,
}

impl From<VSubscription> for Subscription {
    fn from(v_subscription: VSubscription) -> Self {
        match v_subscription {
            VSubscription::Current(subscription) => subscription,
        }
    }
}

#[near(serializers=[borsh, json])]
pub struct SubscriptionOutput {
    pub title: String,
    pub description: String,
    pub image_url: String,
    pub price: U128,
    pub price_wholesale: U128,
}

impl From<VSubscription> for SubscriptionOutput {
    fn from(v_subscription: VSubscription) -> Self {
        match v_subscription {
            VSubscription::Current(subscription) => SubscriptionOutput {
                title: subscription.title,
                description: subscription.description,
                image_url: subscription.image_url,
                price: U128::from(subscription.price),
                price_wholesale: U128::from(subscription.price_wholesale),
            },
        }
    }
}

#[near(serializers=[borsh])]
pub struct AccountSubscription {
    // Timestamp when subscription ends
    pub subscription_ends: SubscriptionEnds,
}

#[near(serializers=[borsh, json])]
pub struct AccountSubscriptionOutput {
    pub subscription_ends: SubscriptionEndsOutput,
}

impl From<AccountSubscription> for AccountSubscriptionOutput {
    fn from(account_subscription: AccountSubscription) -> Self {
        AccountSubscriptionOutput {
            subscription_ends: account_subscription.subscription_ends.to_string(),
        }
    }
}
